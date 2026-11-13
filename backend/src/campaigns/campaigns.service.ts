import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type {
  CreateCampaignsDto,
  UpdateCampaignsDto,
} from './dto/campaigns.dto';
import type { CampaignsEntity } from './entities/campaigns.entity';
import { CampaignsRepository } from './campaigns.repository';
import type { CampaignsQueryDto } from './dto/campaigns.dto';

@Injectable()
export class CampaignsService {
  constructor(private readonly campaignsRepository: CampaignsRepository) {}

  async findAll(
    query: CampaignsQueryDto,
  ): Promise<{ data: CampaignsEntity[]; meta: any }> {
    const { page, limit } = query;
    const { data, total } = await this.campaignsRepository.findAll(
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
  private buildWhere(q: CampaignsQueryDto): Prisma.CampaignWhereInput {
    const where: Prisma.CampaignWhereInput[] = [];
    if (q.channel) where.push({ channel: q.channel });
    if (q.status) where.push({ status: q.status });
    return where.length ? { AND: where } : {};
  }

  async findOne(id: string): Promise<CampaignsEntity> {
    const record = await this.campaignsRepository.findById(id);
    if (!record) {
      throw new NotFoundException(`Campaign ${id} was not found.`);
    }
    return record;
  }

  create(data: CreateCampaignsDto): Promise<CampaignsEntity> {
    return this.campaignsRepository.create(data);
  }

  async update(id: string, data: UpdateCampaignsDto): Promise<CampaignsEntity> {
    await this.findOne(id);
    return this.campaignsRepository.update(id, data);
  }

  async remove(id: string): Promise<CampaignsEntity> {
    await this.findOne(id);
    return this.campaignsRepository.remove(id);
  }
}
