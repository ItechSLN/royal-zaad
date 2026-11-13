import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateCustomersDto,
  UpdateCustomersDto,
} from './dto/customers.dto';
import type {
  CustomerListRow,
  CustomersEntity,
} from './entities/customers.entity';
import { CustomersRepository } from './customers.repository';
import { PaginationQueryDto } from '../common/pagination-query.data';

@Injectable()
export class CustomersService {
  constructor(private readonly customersRepository: CustomersRepository) {}

  async findAll(query: PaginationQueryDto): Promise<{ data: CustomerListRow[]; meta: any }> {
    const { page, limit } = query;
    const { data, total } = await this.customersRepository.findAll(page, limit);

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

  async findOne(id: string): Promise<CustomersEntity> {
    const customer = await this.customersRepository.findById(id);

    if (!customer) {
      throw new NotFoundException(`Customer ${id} was not found.`);
    }

    return customer;
  }

  async create(data: CreateCustomersDto): Promise<CustomersEntity> {
    await this.customersRepository.assertEmailFree(data.email);
    return this.customersRepository.create(data);
  }

  async update(id: string, data: UpdateCustomersDto): Promise<CustomersEntity> {
    const customer = await this.findOne(id);
    if (data.email && data.email !== customer.email) {
      await this.customersRepository.assertEmailFree(data.email, id);
    }
    return this.customersRepository.update(id, data);
  }

  async remove(id: string): Promise<CustomersEntity> {
    const customer = await this.findOne(id);
    if (customer.userId || (await this.customersRepository.hasOrders(id))) {
      throw new BadRequestException({
        message: customer.userId
          ? 'This customer has a storefront login. Deactivate the account under Users instead of deleting it.'
          : 'This customer has orders on record and cannot be deleted.',
      });
    }
    return this.customersRepository.remove(id);
  }
}
