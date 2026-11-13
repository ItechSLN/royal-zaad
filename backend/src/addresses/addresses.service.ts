import { GeocoderService } from '../geo/geocoder.service';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddressesRepository } from './addresses.repository';
import type { CreateAddressDto } from './dto/addresses.dto';
import type { AddressEntity } from './entities/addresses.entity';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@Injectable()
export class AddressesService {
  constructor(
    private readonly addressesRepository: AddressesRepository,
    private readonly prisma: PrismaService,
    private readonly geocoder: GeocoderService,
  ) {}

  private async requireCustomer(currentUser: AuthenticatedUser) {
    const customer = await this.prisma.customer.findUnique({ where: { userId: currentUser.id } });
    if (!customer) {
      throw new BadRequestException({ message: 'No customer profile is linked to this account' });
    }
    return customer;
  }

  async findAll(currentUser: AuthenticatedUser): Promise<AddressEntity[]> {
    const customer = await this.requireCustomer(currentUser);
    return this.addressesRepository.findAllForCustomer(customer.id);
  }

  async create(currentUser: AuthenticatedUser, data: CreateAddressDto): Promise<AddressEntity> {
    const customer = await this.requireCustomer(currentUser);
    const address = await this.addressesRepository.create(customer.id, data);

    // Coordinates power delivery-radius checks and "distance from you".
    // An address that can't be located is still saved — it just has none.
    const hit = await this.geocoder.geocode({
      line1: data.line1,
      city: data.city,
      state: data.state,
      postalCode: data.postalCode,
      country: data.country,
    });
    if (!hit) return address;
    return this.prisma.address.update({
      where: { id: address.id },
      data: { latitude: hit.latitude, longitude: hit.longitude, geocodedAt: new Date() },
    }) as Promise<AddressEntity>;
  }

  async remove(id: string, currentUser: AuthenticatedUser): Promise<AddressEntity> {
    const customer = await this.requireCustomer(currentUser);
    const address = await this.addressesRepository.findById(id);

    if (!address) {
      throw new NotFoundException(`Address ${id} was not found.`);
    }

    if (address.customerId !== customer.id) {
      throw new ForbiddenException('You do not have access to this address');
    }

    // Orders keep pointing at the address they shipped to.
    if (await this.prisma.order.count({ where: { shippingAddressId: id } })) {
      throw new BadRequestException({
        message: 'This address is used by one of your orders and cannot be removed.',
      });
    }

    return this.addressesRepository.remove(id);
  }
}
