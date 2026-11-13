import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreatePaymentsDto, UpdatePaymentsDto } from './dto/payments.dto';
import type { PaymentsEntity } from './entities/payments.entity';

@Injectable()
export class PaymentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page: number, limit: number): Promise<{ data: PaymentsEntity[]; total: number }> {
    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payment.count(),
    ]);

    return { data, total };
  }

  findById(id: string): Promise<PaymentsEntity | null> {
    return this.prisma.payment.findUnique({ where: { id } });
  }

  create(data: CreatePaymentsDto): Promise<PaymentsEntity> {
    return this.prisma.payment.create({
      data: data as unknown as Prisma.PaymentUncheckedCreateInput,
    });
  }

  update(id: string, data: UpdatePaymentsDto, paidAt?: Date): Promise<PaymentsEntity> {
    return this.prisma.payment.update({
      where: { id },
      data: { ...data, ...(paidAt ? { paidAt } : {}) },
    });
  }

  remove(id: string): Promise<PaymentsEntity> {
    return this.prisma.payment.delete({ where: { id } });
  }
}
