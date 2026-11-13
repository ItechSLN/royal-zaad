import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { CreateCmsDto, UpdateCmsDto } from './dto/cms.dto';
import type { CmsEntity } from './entities/cms.entity';
import { CmsRepository } from './cms.repository';
import type { CmsQueryDto } from './dto/cms.dto';

@Injectable()
export class CmsService {
  constructor(private readonly cmsRepository: CmsRepository) {}

  async findAll(query: CmsQueryDto): Promise<{ data: CmsEntity[]; meta: any }> {
    const { page, limit } = query;
    const { data, total } = await this.cmsRepository.findAll(
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
  private buildWhere(q: CmsQueryDto): Prisma.CmsPostWhereInput {
    const where: Prisma.CmsPostWhereInput[] = [];
    if (q.status) where.push({ status: q.status });
    if (q.category) where.push({ category: q.category });
    return where.length ? { AND: where } : {};
  }

  async findOne(id: string): Promise<CmsEntity> {
    const record = await this.cmsRepository.findById(id);
    if (!record) {
      throw new NotFoundException(`Post ${id} was not found.`);
    }
    return record;
  }

  /** The slug is required and unique; derive it from the title when omitted. */
  create(data: CreateCmsDto): Promise<CmsEntity> {
    const slug =
      data.slug?.trim() ||
      data.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

    return this.cmsRepository.create({ ...data, slug });
  }

  async update(id: string, data: UpdateCmsDto): Promise<CmsEntity> {
    await this.findOne(id);
    return this.cmsRepository.update(id, data);
  }

  async remove(id: string): Promise<CmsEntity> {
    await this.findOne(id);
    return this.cmsRepository.remove(id);
  }
}
