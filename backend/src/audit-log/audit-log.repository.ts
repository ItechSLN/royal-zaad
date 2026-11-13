import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateAuditLogDto, UpdateAuditLogDto } from './dto/audit-log.dto';
import type { AuditLogEntity } from './entities/audit-log.entity';

@Injectable()
export class AuditLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    page: number,
    limit: number,
    where: Prisma.AuditEventWhereInput = {},
  ): Promise<{ data: AuditLogEntity[]; total: number }> {
    const [data, total] = await Promise.all([
      this.prisma.auditEvent.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditEvent.count({ where }),
    ]);

    return { data, total };
  }

  findById(id: string): Promise<AuditLogEntity | null> {
    return this.prisma.auditEvent.findUnique({ where: { id } });
  }

  create(data: CreateAuditLogDto): Promise<AuditLogEntity> {
    return this.prisma.auditEvent.create({
      data: data,
    });
  }

  update(id: string, data: UpdateAuditLogDto): Promise<AuditLogEntity> {
    return this.prisma.auditEvent.update({
      where: { id },
      data: data,
    });
  }

  remove(id: string): Promise<AuditLogEntity> {
    return this.prisma.auditEvent.delete({ where: { id } });
  }
}
