import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateCmsDto, UpdateCmsDto } from './dto/cms.dto';
import type { CmsEntity } from './entities/cms.entity';

@Injectable()
export class CmsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    page: number,
    limit: number,
    where: Prisma.CmsPostWhereInput = {},
  ): Promise<{ data: CmsEntity[]; total: number }> {
    const [data, total] = await Promise.all([
      this.prisma.cmsPost.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.cmsPost.count({ where }),
    ]);

    return { data, total };
  }

  findById(id: string): Promise<CmsEntity | null> {
    return this.prisma.cmsPost.findUnique({ where: { id } });
  }

  create(data: CreateCmsDto): Promise<CmsEntity> {
    return this.prisma.cmsPost.create({
      data: data as unknown as Prisma.CmsPostUncheckedCreateInput,
    });
  }

  update(id: string, data: UpdateCmsDto): Promise<CmsEntity> {
    return this.prisma.cmsPost.update({
      where: { id },
      data: data,
    });
  }

  remove(id: string): Promise<CmsEntity> {
    return this.prisma.cmsPost.delete({ where: { id } });
  }
}
