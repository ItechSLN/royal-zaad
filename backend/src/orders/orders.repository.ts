import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ORDER_INCLUDE, type OrdersEntity } from './entities/orders.entity';

type PrismaClientOrTx = PrismaService | Prisma.TransactionClient;

@Injectable()
export class OrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    page: number,
    limit: number,
  ): Promise<{ data: OrdersEntity[]; total: number }> {
    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: ORDER_INCLUDE,
      }),
      this.prisma.order.count(),
    ]);

    return { data, total };
  }

  async findAllByCustomer(
    customerId: string,
    page: number,
    limit: number,
  ): Promise<{ data: OrdersEntity[]; total: number }> {
    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { customerId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: ORDER_INCLUDE,
      }),
      this.prisma.order.count({ where: { customerId } }),
    ]);

    return { data, total };
  }

  findById(
    id: string,
    client: PrismaClientOrTx = this.prisma,
  ): Promise<OrdersEntity | null> {
    return client.order.findUnique({
      where: { id },
      include: ORDER_INCLUDE,
    });
  }

  findByOrderNumber(orderNumber: string): Promise<OrdersEntity | null> {
    return this.prisma.order.findUnique({
      where: { orderNumber },
      include: ORDER_INCLUDE,
    });
  }

  create(
    data: Prisma.OrderUncheckedCreateInput,
    client: PrismaClientOrTx = this.prisma,
  ): Promise<OrdersEntity> {
    return client.order.create({
      data,
      include: ORDER_INCLUDE,
    });
  }

  updateStatus(
    id: string,
    status: Prisma.OrderUpdateInput['status'],
    client: PrismaClientOrTx = this.prisma,
  ): Promise<OrdersEntity> {
    return client.order.update({
      where: { id },
      data: { status },
      include: ORDER_INCLUDE,
    });
  }

  updateShippingAddress(
    id: string,
    shippingAddressId: string,
  ): Promise<OrdersEntity> {
    return this.prisma.order.update({
      where: { id },
      data: { shippingAddressId },
      include: ORDER_INCLUDE,
    });
  }

  remove(id: string): Promise<OrdersEntity> {
    return this.prisma.order.delete({
      where: { id },
      include: ORDER_INCLUDE,
    });
  }
}
