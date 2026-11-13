import { Injectable, NotFoundException } from '@nestjs/common';
import type { CreateVariantsDto, UpdateVariantsDto } from './dto/variants.dto';
import type { VariantsEntity } from './entities/variants.entity';
import { VariantsRepository } from './variants.repository';

/** Cost price is back-office data and never reaches a shopper. */
const toPublic = ({ costPrice: _cost, ...variant }: VariantsEntity) =>
  variant as VariantsEntity;

@Injectable()
export class VariantsService {
  constructor(private readonly variantsRepository: VariantsRepository) {}

  async findForProduct(
    productId: string,
    isStaff = false,
  ): Promise<VariantsEntity[]> {
    await this.assertProduct(productId, !isStaff);
    const variants = await this.variantsRepository.findForProduct(productId);
    return isStaff
      ? variants
      : variants.filter((v) => v.isActive).map(toPublic);
  }

  async findOneForViewer(id: string, isStaff = false): Promise<VariantsEntity> {
    const variant = await this.findOne(id);
    if (isStaff) return variant;

    const published = await this.variantsRepository.productExists(
      variant.productId,
      true,
    );
    if (!variant.isActive || !published) {
      throw new NotFoundException(`Variant ${id} was not found.`);
    }
    return toPublic(variant);
  }

  async findOne(id: string): Promise<VariantsEntity> {
    const variant = await this.variantsRepository.findById(id);
    if (!variant) {
      throw new NotFoundException(`Variant ${id} was not found.`);
    }
    return variant;
  }

  async create(
    productId: string,
    data: CreateVariantsDto,
  ): Promise<VariantsEntity> {
    await this.assertProduct(productId);
    return this.variantsRepository.create(productId, data);
  }

  async update(id: string, data: UpdateVariantsDto): Promise<VariantsEntity> {
    await this.findOne(id);
    return this.variantsRepository.update(id, data);
  }

  async remove(id: string): Promise<VariantsEntity> {
    await this.findOne(id);
    return this.variantsRepository.remove(id);
  }

  /** Shoppers (`publishedOnly`) cannot see variants of draft products. */
  private async assertProduct(
    productId: string,
    publishedOnly = false,
  ): Promise<void> {
    const exists = await this.variantsRepository.productExists(
      productId,
      publishedOnly,
    );
    if (!exists) {
      throw new NotFoundException(`Product ${productId} was not found.`);
    }
  }
}
