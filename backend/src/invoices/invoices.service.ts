import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { CreateInvoicesDto, UpdateInvoicesDto } from './dto/invoices.dto';
import type { InvoicesEntity } from './entities/invoices.entity';
import { InvoicesRepository } from './invoices.repository';
import type { InvoicesQueryDto } from './dto/invoices.dto';

@Injectable()
export class InvoicesService {
  constructor(private readonly invoicesRepository: InvoicesRepository) {}

  async findAll(
    query: InvoicesQueryDto,
  ): Promise<{ data: InvoicesEntity[]; meta: any }> {
    const { page, limit } = query;
    const { data, total } = await this.invoicesRepository.findAll(
      page,
      limit,
      this.buildWhere(query),
    );

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  /** Only the filters the list screen actually sends are applied. */
  private buildWhere(q: InvoicesQueryDto): Prisma.InvoiceWhereInput {
    const where: Prisma.InvoiceWhereInput[] = [];
    if (q.status) where.push({ status: q.status });
    if (q.customerId) where.push({ customerId: q.customerId });
    return where.length ? { AND: where } : {};
  }

  async findOne(id: string): Promise<InvoicesEntity> {
    const record = await this.invoicesRepository.findById(id);
    if (!record) {
      throw new NotFoundException(`Invoice ${id} was not found.`);
    }
    return record;
  }

  /**
   * Invoice numbers run per calendar year. The opening balance defaults to the
   * full amount so a new invoice starts unpaid.
   */
  async create(data: CreateInvoicesDto): Promise<InvoicesEntity> {
    await this.assertReferences(data.customerId, data.orderId);

    const payload = this.settle({
      ...data,
      balance: data.balance ?? data.amount,
    });
    this.assertConsistent(payload);

    if (payload.number) return this.invoicesRepository.create(payload);

    const year = new Date().getFullYear();
    const latest = await this.invoicesRepository.latestNumberForYear(year);
    const sequence = (Number(latest?.split('-')[2]) || 0) + 1;

    return this.invoicesRepository.create({
      ...payload,
      number: `INV-${year}-${String(sequence).padStart(5, '0')}`,
    });
  }

  /**
   * Changing the amount moves the outstanding balance by the same difference,
   * so a part-paid invoice keeps what was already collected.
   */
  async update(id: string, data: UpdateInvoicesDto): Promise<InvoicesEntity> {
    const existing = await this.findOne(id);

    if (data.customerId || data.orderId) {
      await this.assertReferences(
        data.customerId ?? existing.customerId,
        data.orderId ?? existing.orderId ?? undefined,
      );
    }

    const amount = data.amount ?? Number(existing.amount);
    let balance = data.balance;
    if (balance === undefined && data.amount !== undefined) {
      balance = Math.max(
        0,
        Number(existing.balance) + (data.amount - Number(existing.amount)),
      );
    }

    const payload = this.settle({ ...data, balance }, existing.status);
    this.assertConsistent({
      amount,
      balance: payload.balance ?? Number(existing.balance),
      issuedAt: payload.issuedAt ?? existing.issuedAt.toISOString(),
      dueAt: payload.dueAt ?? existing.dueAt.toISOString(),
    });

    return this.invoicesRepository.update(id, payload);
  }

  /** PAID means nothing is owed; settling the balance in full means PAID. */
  private settle<T extends UpdateInvoicesDto>(data: T, current?: string): T {
    if (data.status === 'PAID') return { ...data, balance: 0 };
    if (
      data.balance === 0 &&
      data.status === undefined &&
      current !== 'VOID'
    ) {
      return { ...data, status: 'PAID' };
    }
    if (
      data.balance !== undefined &&
      data.balance > 0 &&
      data.status === undefined &&
      current === 'PAID'
    ) {
      return { ...data, status: 'OPEN' };
    }
    return data;
  }

  private assertConsistent(v: {
    amount?: number;
    balance?: number;
    issuedAt?: string;
    dueAt?: string;
  }) {
    const errors: Record<string, string> = {};
    if (v.amount !== undefined && v.balance !== undefined && v.balance > v.amount) {
      errors.balance = 'Balance cannot exceed the invoice amount';
    }
    if (v.issuedAt && v.dueAt && new Date(v.dueAt) < new Date(v.issuedAt)) {
      errors.dueAt = 'Due date cannot be before the issue date';
    }
    if (Object.keys(errors).length) {
      throw new BadRequestException({ message: 'Validation failed', errors });
    }
  }

  private async assertReferences(customerId: string, orderId?: string) {
    const customer = await this.invoicesRepository.findCustomer(customerId);
    if (!customer) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: { customerId: 'Customer was not found' },
      });
    }
    if (!orderId) return;
    const order = await this.invoicesRepository.findOrder(orderId);
    if (!order || order.customerId !== customerId) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: { orderId: 'Order was not found for this customer' },
      });
    }
  }

  async remove(id: string): Promise<InvoicesEntity> {
    await this.findOne(id);
    return this.invoicesRepository.remove(id);
  }
}
