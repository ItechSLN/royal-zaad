import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CreateShipmentsDto,
  UpdateShipmentsDto,
} from './dto/shipments.dto';
import type { ShipmentsEntity } from './entities/shipments.entity';

@Injectable()
export class ShipmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    page: number,
    limit: number,
    where: Prisma.ShipmentWhereInput = {},
  ): Promise<{ data: ShipmentsEntity[]; total: number }> {
    const [data, total] = await Promise.all([
      this.prisma.shipment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { order: { include: { customer: true } } },
      }),
      this.prisma.shipment.count({ where }),
    ]);

    return { data, total };
  }

  findById(id: string): Promise<ShipmentsEntity | null> {
    return this.prisma.shipment.findUnique({
      where: { id },
      include: { order: { include: { customer: true } } },
    });
  }

  findOrder(orderId: string) {
    return this.prisma.order.findUnique({
      where: { id: orderId },
      include: { shippingAddress: true },
    });
  }

  create(data: CreateShipmentsDto): Promise<ShipmentsEntity> {
    return this.prisma.shipment.create({
      data: data,
    });
  }

  update(
    id: string,
    data: Omit<UpdateShipmentsDto, 'attempts'> & {
      attempts?: number | { increment: number };
    },
  ): Promise<ShipmentsEntity> {
    return this.prisma.shipment.update({
      where: { id },
      data: data,
    });
  }

  remove(id: string): Promise<ShipmentsEntity> {
    return this.prisma.shipment.delete({ where: { id } });
  }
}
