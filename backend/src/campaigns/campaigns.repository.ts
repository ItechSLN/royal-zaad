import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CreateCampaignsDto,
  UpdateCampaignsDto,
} from './dto/campaigns.dto';
import type { CampaignsEntity } from './entities/campaigns.entity';

@Injectable()
export class CampaignsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    page: number,
    limit: number,
    where: Prisma.CampaignWhereInput = {},
  ): Promise<{ data: CampaignsEntity[]; total: number }> {
    const [data, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.campaign.count({ where }),
    ]);

    return { data, total };
  }

  findById(id: string): Promise<CampaignsEntity | null> {
    return this.prisma.campaign.findUnique({ where: { id } });
  }

  create(data: CreateCampaignsDto): Promise<CampaignsEntity> {
    return this.prisma.campaign.create({
      data: data,
    });
  }

  update(id: string, data: UpdateCampaignsDto): Promise<CampaignsEntity> {
    return this.prisma.campaign.update({
      where: { id },
      data: data,
    });
  }

  remove(id: string): Promise<CampaignsEntity> {
    return this.prisma.campaign.delete({ where: { id } });
  }
}
