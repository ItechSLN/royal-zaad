import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { CreateAuditLogDto, UpdateAuditLogDto } from './dto/audit-log.dto';
import type { AuditLogEntity } from './entities/audit-log.entity';
import { AuditLogRepository } from './audit-log.repository';
import type { AuditLogQueryDto } from './dto/audit-log.dto';

@Injectable()
export class AuditLogService {
  constructor(private readonly auditLogRepository: AuditLogRepository) {}

  async findAll(
    query: AuditLogQueryDto,
  ): Promise<{ data: AuditLogEntity[]; meta: any }> {
    const { page, limit } = query;
    const { data, total } = await this.auditLogRepository.findAll(
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
  private buildWhere(q: AuditLogQueryDto): Prisma.AuditEventWhereInput {
    const where: Prisma.AuditEventWhereInput[] = [];
    if (q.entity) where.push({ entity: q.entity });
    if (q.actor)
      where.push({ actor: { contains: q.actor, mode: 'insensitive' } });
    if (q.action) where.push({ action: q.action });
    return where.length ? { AND: where } : {};
  }

  async findOne(id: string): Promise<AuditLogEntity> {
    const record = await this.auditLogRepository.findById(id);
    if (!record) {
      throw new NotFoundException(`Audit event ${id} was not found.`);
    }
    return record;
  }

  create(data: CreateAuditLogDto): Promise<AuditLogEntity> {
    return this.auditLogRepository.create(data);
  }

  async update(id: string, data: UpdateAuditLogDto): Promise<AuditLogEntity> {
    await this.findOne(id);
    return this.auditLogRepository.update(id, data);
  }

  async remove(id: string): Promise<AuditLogEntity> {
    await this.findOne(id);
    return this.auditLogRepository.remove(id);
  }
}
