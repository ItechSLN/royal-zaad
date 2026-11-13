import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateInvoicesDto, UpdateInvoicesDto } from './dto/invoices.dto';
import type { InvoicesEntity } from './entities/invoices.entity';

@Injectable()
export class InvoicesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    page: number,
    limit: number,
    where: Prisma.InvoiceWhereInput = {},
  ): Promise<{ data: InvoicesEntity[]; total: number }> {
    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { customer: true, order: true },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return { data, total };
  }

  findById(id: string): Promise<InvoicesEntity | null> {
    return this.prisma.invoice.findUnique({
      where: { id },
      include: { customer: true, order: true },
    });
  }

  create(data: CreateInvoicesDto): Promise<InvoicesEntity> {
    return this.prisma.invoice.create({
      data: data as unknown as Prisma.InvoiceUncheckedCreateInput,
    });
  }

  update(id: string, data: UpdateInvoicesDto): Promise<InvoicesEntity> {
    return this.prisma.invoice.update({
      where: { id },
      data: data,
    });
  }

  remove(id: string): Promise<InvoicesEntity> {
    return this.prisma.invoice.delete({ where: { id } });
  }

  /** Highest invoice number issued in the year, e.g. INV-2026-00042. */
  async latestNumberForYear(year: number): Promise<string | null> {
    const latest = await this.prisma.invoice.findFirst({
      where: { number: { startsWith: `INV-${year}-` } },
      orderBy: { number: 'desc' },
      select: { number: true },
    });
    return latest?.number ?? null;
  }

  findCustomer(id: string) {
    return this.prisma.customer.findUnique({ where: { id } });
  }

  findOrder(id: string) {
    return this.prisma.order.findUnique({ where: { id } });
  }
}
