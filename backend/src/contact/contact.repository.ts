import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateContactDto, UpdateContactDto } from './dto/contact.dto';
import type { ContactEntity } from './entities/contact.entity';

@Injectable()
export class ContactRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    page: number,
    limit: number,
    where: Prisma.ContactMessageWhereInput = {},
  ): Promise<{ data: ContactEntity[]; total: number }> {
    const [data, total] = await Promise.all([
      this.prisma.contactMessage.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.contactMessage.count({ where }),
    ]);

    return { data, total };
  }

  /** Totals per status, for the inbox tab badges. */
  async countByStatus(): Promise<Record<string, number>> {
    const rows = await this.prisma.contactMessage.groupBy({
      by: ['status'],
      _count: { _all: true },
    });

    return rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.status] = row._count._all;
      return acc;
    }, {});
  }

  findById(id: string): Promise<ContactEntity | null> {
    return this.prisma.contactMessage.findUnique({ where: { id } });
  }

  create(data: CreateContactDto): Promise<ContactEntity> {
    return this.prisma.contactMessage.create({
      data: data,
    });
  }

  update(
    id: string,
    data: UpdateContactDto,
    respondedAt?: Date,
  ): Promise<ContactEntity> {
    return this.prisma.contactMessage.update({
      where: { id },
      data: {
        ...(data as unknown as Prisma.ContactMessageUncheckedUpdateInput),
        ...(respondedAt ? { respondedAt } : {}),
      },
    });
  }

  remove(id: string): Promise<ContactEntity> {
    return this.prisma.contactMessage.delete({ where: { id } });
  }
}
