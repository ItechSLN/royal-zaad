import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from './payments.service';
import { OrdersService } from '../orders/orders.service';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

/** How long an unpaid card order holds its stock before it is released. */
const PAYMENT_TIMEOUT_MINUTES = Number(
  process.env.ORDER_PAYMENT_TIMEOUT_MINUTES ?? 60,
);
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;
const STARTUP_SWEEP_DELAY_MS = 10_000;

const toMinorUnits = (amount: unknown) => Math.round(Number(amount) * 100);

/**
 * Card payments through Stripe Payment Intents.
 *
 * The browser only ever receives a client secret; an order is settled when
 * Stripe says so — via the signed webhook, or by the server re-reading the
 * PaymentIntent — never on the client's word. Configured from
 * STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY and STRIPE_WEBHOOK_SECRET.
 */
@Injectable()
export class StripeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StripeService.name);
  private readonly stripe: Stripe | null = process.env.STRIPE_SECRET_KEY
    ? new Stripe(process.env.STRIPE_SECRET_KEY)
    : null;
  private sweeper?: NodeJS.Timeout;
  private startupSweep?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
    private readonly ordersService: OrdersService,
  ) {}

  onModuleInit() {
    if (!this.stripe) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('STRIPE_SECRET_KEY must be set in production');
      }
      this.logger.warn('STRIPE_SECRET_KEY not set — card payments are disabled');
      return;
    }

    const sweep = () =>
      this.releaseAbandonedOrders().catch((error) =>
        this.logger.error(`Abandoned-order sweep failed: ${error.message}`),
      );

    // Once shortly after boot (catches orders that went stale while the
    // server was down), then on a fixed interval.
    this.startupSweep = setTimeout(sweep, STARTUP_SWEEP_DELAY_MS);
    this.startupSweep.unref();
    this.sweeper = setInterval(sweep, SWEEP_INTERVAL_MS);
    this.sweeper.unref();
  }

  onModuleDestroy() {
    if (this.sweeper) clearInterval(this.sweeper);
    if (this.startupSweep) clearTimeout(this.startupSweep);
  }

  private client(): Stripe {
    if (!this.stripe) {
      throw new ServiceUnavailableException({
        message: 'Card payments are not available right now',
      });
    }
    return this.stripe;
  }

  /** The customer's own order, with a card payment still to collect. */
  private async payableOrder(orderId: string, user: AuthenticatedUser) {
    const customer = await this.prisma.customer.findUnique({
      where: { userId: user.id },
    });
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });

    if (!order || !order.payment) {
      throw new NotFoundException(`Order ${orderId} was not found.`);
    }
    if (!customer || order.customerId !== customer.id) {
      throw new ForbiddenException('You do not have access to this order');
    }

    return { order, payment: order.payment };
  }

  /**
   * Returns a client secret for the order's PaymentIntent, creating it on the
   * first call and reusing it after that, so a refresh never double-charges.
   */
  async createIntent(orderId: string, user: AuthenticatedUser) {
    try {
      return await this.createOrReuseIntent(orderId, user);
    } catch (error) {
      if (error instanceof Stripe.errors.StripeError) {
        this.logger.error(`Stripe rejected intent for ${orderId}: ${error.message}`);
        throw new BadGatewayException({
          message: 'The payment provider is unavailable. Please try again.',
        });
      }
      throw error;
    }
  }

  private async createOrReuseIntent(orderId: string, user: AuthenticatedUser) {
    const { order, payment } = await this.payableOrder(orderId, user);
    const stripe = this.client();

    if (payment.status === 'PAID') {
      throw new BadRequestException({ message: 'This order is already paid' });
    }
    if (order.status !== 'PENDING') {
      throw new BadRequestException({
        message: 'This order can no longer be paid',
      });
    }
    if (payment.provider !== 'card') {
      throw new BadRequestException({
        message: 'This order is not set up for card payment',
      });
    }

    const amount = toMinorUnits(payment.amount);
    const currency = payment.currency.toLowerCase();

    if (payment.transactionId) {
      const existing = await stripe.paymentIntents.retrieve(payment.transactionId);
      if (existing.status === 'succeeded') {
        await this.settle(existing);
        throw new BadRequestException({ message: 'This order is already paid' });
      }
      if (existing.status !== 'canceled' && existing.amount === amount) {
        return {
          clientSecret: existing.client_secret,
          publishableKey: process.env.STRIPE_PUBLISHABLE_KEY ?? null,
        };
      }
    }

    const intent = await stripe.paymentIntents.create(
      {
        amount,
        currency,
        automatic_payment_methods: { enabled: true },
        description: `Order ${order.orderNumber}`,
        metadata: { orderId: order.id, paymentId: payment.id },
      },
      { idempotencyKey: `order-${order.id}-${amount}-${payment.transactionId ?? 'new'}` },
    );

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { transactionId: intent.id },
    });

    return {
      clientSecret: intent.client_secret,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY ?? null,
    };
  }

  /**
   * Re-reads the order's PaymentIntent from Stripe and settles it if it has
   * succeeded. Lets the storefront confirm straight after checkout without
   * waiting for the webhook — Stripe stays the source of truth.
   */
  async syncPayment(orderId: string, user: AuthenticatedUser) {
    const { payment } = await this.payableOrder(orderId, user);

    if (payment.status !== 'PAID' && payment.transactionId) {
      const intent = await this.client().paymentIntents.retrieve(
        payment.transactionId,
      );
      if (intent.status === 'succeeded') await this.settle(intent);
    }

    const latest = await this.prisma.payment.findUnique({
      where: { id: payment.id },
    });
    return { status: latest?.status ?? payment.status };
  }

  /** Verifies the signature and applies the event. */
  async handleWebhook(rawBody: Buffer | undefined, signature: string | undefined) {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      throw new ServiceUnavailableException({ message: 'Webhook not configured' });
    }
    if (!rawBody || !signature) {
      throw new BadRequestException({ message: 'Missing Stripe signature' });
    }

    let event: Stripe.Event;
    try {
      event = this.client().webhooks.constructEvent(rawBody, signature, secret);
    } catch (error) {
      throw new BadRequestException({
        message: `Invalid Stripe signature: ${(error as Error).message}`,
      });
    }

    if (event.type === 'payment_intent.succeeded') {
      await this.settle(event.data.object);
    } else if (event.type === 'payment_intent.payment_failed') {
      const intent = event.data.object;
      this.logger.warn(
        `Payment failed for ${intent.id}: ${intent.last_payment_error?.message ?? 'unknown reason'}`,
      );
    }

    return { received: true };
  }

  /**
   * Marks the matching payment PAID once the captured amount and currency are
   * checked against what the order is owed. Idempotent: replays are no-ops.
   */
  private async settle(intent: Stripe.PaymentIntent) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        OR: [
          { transactionId: intent.id },
          ...(intent.metadata?.paymentId ? [{ id: intent.metadata.paymentId }] : []),
        ],
      },
    });

    if (!payment) {
      this.logger.warn(`No payment matches PaymentIntent ${intent.id}`);
      return;
    }
    if (payment.status === 'PAID') return;

    const expected = toMinorUnits(payment.amount);
    if (
      intent.amount_received !== expected ||
      intent.currency !== payment.currency.toLowerCase()
    ) {
      this.logger.error(
        `PaymentIntent ${intent.id} captured ${intent.amount_received} ${intent.currency}, expected ${expected} ${payment.currency} — not settling`,
      );
      return;
    }

    await this.paymentsService.update(payment.id, {
      status: 'PAID',
      transactionId: intent.id,
    });
  }

  /**
   * Cancels card orders left unpaid past the timeout, so abandoned checkouts
   * don't hold stock forever. Checks Stripe first: a payment that succeeded
   * but whose webhook was missed is settled instead of cancelled.
   */
  async releaseAbandonedOrders() {
    const cutoff = new Date(Date.now() - PAYMENT_TIMEOUT_MINUTES * 60_000);
    const stale = await this.prisma.payment.findMany({
      where: {
        provider: 'card',
        status: 'PENDING',
        createdAt: { lt: cutoff },
        order: { status: 'PENDING' },
      },
      take: 50,
    });

    for (const payment of stale) {
      if (payment.transactionId) {
        const intent = await this.client().paymentIntents.retrieve(
          payment.transactionId,
        );
        if (intent.status === 'succeeded') {
          await this.settle(intent);
          continue;
        }
        if (intent.status === 'processing') continue;
        if (intent.status !== 'canceled') {
          await this.client().paymentIntents.cancel(intent.id);
        }
      }

      await this.ordersService.update(payment.orderId, { status: 'CANCELLED' });
      this.logger.log(`Released unpaid order ${payment.orderId}`);
    }
  }
}
