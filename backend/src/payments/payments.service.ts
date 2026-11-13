import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PaymentStatus } from '@prisma/client';
import type { CreatePaymentsDto, UpdatePaymentsDto } from './dto/payments.dto';
import type { PaymentsEntity } from './entities/payments.entity';
import { PaymentsRepository } from './payments.repository';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationQueryDto } from '../common/pagination-query.data';
import { OrderEmailsService } from '../mail/order-emails.service';
import { OrderStatusService } from '../orders/order-status.service';

const ALLOWED_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  PENDING: ['PAID', 'FAILED'],
  PAID: ['REFUNDED'],
  FAILED: ['PENDING'],
  REFUNDED: [],
};

@Injectable()
export class PaymentsService {
  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private readonly prisma: PrismaService,
    private readonly orderEmails: OrderEmailsService,
    private readonly orderStatus: OrderStatusService,
  ) {}

  async findAll(
    query: PaginationQueryDto,
  ): Promise<{ data: PaymentsEntity[]; meta: any }> {
    const { page, limit } = query;
    const { data, total } = await this.paymentsRepository.findAll(page, limit);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<PaymentsEntity> {
    const payment = await this.paymentsRepository.findById(id);

    if (!payment) {
      throw new NotFoundException(`Payment ${id} was not found.`);
    }

    return payment;
  }

  create(data: CreatePaymentsDto): Promise<PaymentsEntity> {
    return this.paymentsRepository.create(data);
  }

  async update(id: string, data: UpdatePaymentsDto): Promise<PaymentsEntity> {
    const existing = await this.findOne(id);

    if (data.status && data.status !== existing.status) {
      const allowed = ALLOWED_TRANSITIONS[existing.status];
      if (!allowed.includes(data.status)) {
        throw new BadRequestException({
          message: 'Validation failed',
          errors: {
            status: `Cannot transition payment from ${existing.status} to ${data.status}`,
          },
        });
      }
    }

    const settled = data.status === 'PAID' && existing.status !== 'PAID';
    const paidAt = settled ? new Date() : undefined;

    const payment = await this.paymentsRepository.update(id, data, paidAt);

    // Settling the payment releases the order into fulfilment.
    if (settled) {
      // Every shop's pending sub-order moves into fulfilment together.
      const released = await this.prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({
          where: { id: existing.orderId },
          select: { status: true },
        });
        if (order?.status !== 'PENDING') return false;
        await this.orderStatus.markPaid(existing.orderId, tx);
        return true;
      });

      if (!released) {
        // Money arrived for an order that had already moved on (e.g. it was
        // cancelled as abandoned) — staff need to refund or reinstate it.
        await this.prisma.notification.create({
          data: {
            title: 'Payment received for a closed order',
            body: `Payment ${id} settled after order ${existing.orderId} was closed. Review and refund if needed.`,
            severity: 'CRITICAL',
            meta: 'Payments',
          },
        });
      } else {
        void this.orderEmails
          .paymentReceived(existing.orderId)
          .catch(() => undefined);
      }
    }

    // A refunded payment closes the order. If it never left the warehouse the
    // order is cancelled instead, which puts its stock back and releases its
    // coupon; once shipped or delivered, it is marked refunded.
    if (data.status === 'REFUNDED' && existing.status !== 'REFUNDED') {
      await this.prisma.$transaction((tx) =>
        this.orderStatus.markRefunded(existing.orderId, tx),
      );
    }

    return payment;
  }

  async remove(id: string): Promise<PaymentsEntity> {
    await this.findOne(id);
    return this.paymentsRepository.remove(id);
  }
}
