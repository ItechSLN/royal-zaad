import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CreateBrandsDto, UpdateBrandsDto } from './dto/brands.dto';
import type { BrandsEntity } from './entities/brands.entity';
import { BrandsRepository } from './brands.repository';
import { PaginationQueryDto } from '../common/pagination-query.data';

@Injectable()
export class BrandsService {
  constructor(private readonly brandsRepository: BrandsRepository) {}

  async findAll(
    query: PaginationQueryDto,
  ): Promise<{ data: BrandsEntity[]; meta: any }> {
    const { page, limit } = query;
    const { data, total } = await this.brandsRepository.findAll(page, limit);

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

  async findOne(id: string): Promise<BrandsEntity> {
    const brand = await this.brandsRepository.findById(id);

    if (!brand) {
      throw new NotFoundException(`Brand ${id} was not found.`);
    }

    return brand;
  }

  create(data: CreateBrandsDto): Promise<BrandsEntity> {
    return this.brandsRepository.create(data);
  }

  async update(id: string, data: UpdateBrandsDto): Promise<BrandsEntity> {
    await this.findOne(id);
    return this.brandsRepository.update(id, data);
  }

  async remove(id: string): Promise<BrandsEntity> {
    await this.findOne(id);

    const productCount = await this.brandsRepository.countProducts(id);
    if (productCount > 0) {
      throw new BadRequestException(
        `Brand cannot be deleted while ${productCount} product(s) still reference it.`,
      );
    }

    return this.brandsRepository.remove(id);
  }
}
