import { BadRequestException, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CreateCustomersDto,
  UpdateCustomersDto,
} from './dto/customers.dto';
import type {
  CustomerListRow,
  CustomersEntity,
} from './entities/customers.entity';

const CUSTOMER_INCLUDE = { addresses: true } as const;

@Injectable()
export class CustomersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page: number, limit: number): Promise<{ data: CustomerListRow[]; total: number }> {
    const [rows, total] = await Promise.all([
      this.prisma.customer.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { ...CUSTOMER_INCLUDE, _count: { select: { orders: true } } },
      }),
      this.prisma.customer.count(),
    ]);

    // Lifetime spend for the page in one query; cancelled/refunded orders
    // don't count (same rule as the storefront account summary).
    const spend = await this.prisma.order.groupBy({
      by: ['customerId'],
      where: {
        customerId: { in: rows.map((c) => c.id) },
        status: { notIn: ['CANCELLED', 'REFUNDED'] },
      },
      _sum: { total: true },
    });

    const data = rows.map(({ _count, ...customer }) => ({
      ...customer,
      orderCount: _count.orders,
      totalSpend: (
        spend.find((s) => s.customerId === customer.id)?._sum.total ?? 0
      ).toString(),
    }));

    return { data, total };
  }

  /** Email is unique across customers and the logins they are linked to. */
  async assertEmailFree(email: string, exceptCustomerId?: string): Promise<void> {
    const [customer, user] = await Promise.all([
      this.prisma.customer.findUnique({ where: { email } }),
      this.prisma.user.findUnique({ where: { email }, include: { customer: true } }),
    ]);
    if (
      (customer && customer.id !== exceptCustomerId) ||
      (user && (!exceptCustomerId || user.customer?.id !== exceptCustomerId))
    ) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: { email: 'A customer or account with this email already exists' },
      });
    }
  }

  findById(id: string): Promise<CustomersEntity | null> {
    return this.prisma.customer.findUnique({
      where: { id },
      include: CUSTOMER_INCLUDE,
    });
  }

  create(data: CreateCustomersDto): Promise<CustomersEntity> {
    return this.prisma.customer.create({
      data: data as Prisma.CustomerUncheckedCreateInput,
      include: CUSTOMER_INCLUDE,
    });
  }

  update(id: string, data: UpdateCustomersDto): Promise<CustomersEntity> {
    // Name and email on a linked login follow the customer record, otherwise
    // the customer would keep signing in with the old address.
    return this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.update({
        where: { id },
        data: data as Prisma.CustomerUncheckedUpdateInput,
        include: CUSTOMER_INCLUDE,
      });
      if (customer.userId && (data.email || data.firstName || data.lastName)) {
        await tx.user.update({
          where: { id: customer.userId },
          data: {
            ...(data.email ? { email: data.email } : {}),
            ...(data.firstName ? { firstName: data.firstName } : {}),
            ...(data.lastName ? { lastName: data.lastName } : {}),
          },
        });
      }
      return customer;
    });
  }

  async hasOrders(customerId: string): Promise<boolean> {
    return (await this.prisma.order.count({ where: { customerId } })) > 0;
  }

  remove(id: string): Promise<CustomersEntity> {
    return this.prisma.customer.delete({
      where: { id },
      include: CUSTOMER_INCLUDE,
    });
  }
}
