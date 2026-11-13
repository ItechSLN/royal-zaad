import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateAddressDto } from './dto/addresses.dto';
import type { AddressEntity } from './entities/addresses.entity';

@Injectable()
export class AddressesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAllForCustomer(customerId: string): Promise<AddressEntity[]> {
    return this.prisma.address.findMany({
      where: { customerId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  findById(id: string): Promise<AddressEntity | null> {
    return this.prisma.address.findUnique({ where: { id } });
  }

  async create(customerId: string, data: CreateAddressDto): Promise<AddressEntity> {
    if (data.isDefault) {
      await this.prisma.address.updateMany({ where: { customerId }, data: { isDefault: false } });
    }

    return this.prisma.address.create({
      data: { ...data, customerId },
    });
  }

  remove(id: string): Promise<AddressEntity> {
    return this.prisma.address.delete({ where: { id } });
  }
}
