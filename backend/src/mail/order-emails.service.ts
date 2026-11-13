import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from './mail.service';

const money = (value: unknown) => `$${Number(value).toFixed(2)}`;

/** Customer-facing emails for each step of an order's life. */
@Injectable()
export class OrderEmailsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  private load(orderId: string) {
    return this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        payment: true,
        shippingAddress: true,
        items: { include: { product: { select: { name: true } } } },
      },
    });
  }

  async orderPlaced(orderId: string) {
    const order = await this.load(orderId);
    if (!order?.customer.email) return;

    const awaitingCard =
      order.payment?.provider === 'card' && order.payment.status !== 'PAID';
    const address = order.shippingAddress;

    const { html, text } = this.mail.layout(
      `Thank you, ${order.customer.firstName}.`,
      [
        `We've received order ${order.orderNumber}.`,
        ...order.items.map(
          (item) => `${item.quantity} × ${item.product.name} — ${money(item.total)}`,
        ),
        `Subtotal ${money(order.subtotal)} · Discount −${money(order.discountTotal)} · Shipping ${money(order.shippingTotal)} · Tax ${money(order.taxTotal)}`,
        `Total ${money(order.total)}`,
        ...(address
          ? [`Delivering to ${address.recipientName}, ${address.line1}, ${address.city} ${address.postalCode}, ${address.country}.`]
          : []),
        order.payment?.provider === 'cod'
          ? 'You will pay the courier on delivery.'
          : awaitingCard
            ? "We'll email you again as soon as your payment is confirmed."
            : 'Your payment has been received.',
      ],
      { label: 'Track your order', url: this.mail.appUrl(`/track/${order.orderNumber}`) },
    );

    await this.mail.send({
      to: order.customer.email,
      subject: `Order ${order.orderNumber} confirmed`,
      html,
      text,
    });
  }

  async paymentReceived(orderId: string) {
    const order = await this.load(orderId);
    if (!order?.customer.email) return;

    const { html, text } = this.mail.layout(
      'Payment received',
      [
        `We've received your payment of ${money(order.payment?.amount ?? order.total)} for order ${order.orderNumber}.`,
        'Your order is now being prepared for dispatch.',
      ],
      { label: 'View your order', url: this.mail.appUrl(`/account/orders`) },
    );

    await this.mail.send({
      to: order.customer.email,
      subject: `Payment received for ${order.orderNumber}`,
      html,
      text,
    });
  }

  async orderShipped(orderId: string) {
    const order = await this.load(orderId);
    if (!order?.customer.email) return;

    const { html, text } = this.mail.layout(
      'Your order is on its way',
      [`Order ${order.orderNumber} has shipped.`],
      { label: 'Track your order', url: this.mail.appUrl(`/track/${order.orderNumber}`) },
    );

    await this.mail.send({
      to: order.customer.email,
      subject: `Order ${order.orderNumber} has shipped`,
      html,
      text,
    });
  }
}
