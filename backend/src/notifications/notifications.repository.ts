import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CreateAlertRuleDto,
  CreateNotificationsDto,
  UpdateAlertRuleDto,
  UpdateNotificationsDto,
} from './dto/notifications.dto';
import type {
  AlertRuleEntity,
  NotificationsEntity,
} from './entities/notifications.entity';

@Injectable()
export class NotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    page: number,
    limit: number,
    where: Prisma.NotificationWhereInput = {},
  ): Promise<{ data: NotificationsEntity[]; total: number }> {
    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return { data, total };
  }

  countUnread(): Promise<number> {
    return this.prisma.notification.count({ where: { unread: true } });
  }

  countCritical(): Promise<number> {
    return this.prisma.notification.count({ where: { severity: 'CRITICAL' } });
  }

  findById(id: string): Promise<NotificationsEntity | null> {
    return this.prisma.notification.findUnique({ where: { id } });
  }

  create(data: CreateNotificationsDto): Promise<NotificationsEntity> {
    return this.prisma.notification.create({
      data: data,
    });
  }

  update(
    id: string,
    data: UpdateNotificationsDto,
  ): Promise<NotificationsEntity> {
    return this.prisma.notification.update({
      where: { id },
      data: data,
    });
  }

  markAllRead(): Promise<{ count: number }> {
    return this.prisma.notification.updateMany({
      where: { unread: true },
      data: { unread: false },
    });
  }

  remove(id: string): Promise<NotificationsEntity> {
    return this.prisma.notification.delete({ where: { id } });
  }

  /* ── alert rules ── */

  async findAllRules(
    page: number,
    limit: number,
  ): Promise<{ data: AlertRuleEntity[]; total: number }> {
    const [data, total] = await Promise.all([
      this.prisma.alertRule.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.alertRule.count(),
    ]);

    return { data, total };
  }

  findRuleById(id: string): Promise<AlertRuleEntity | null> {
    return this.prisma.alertRule.findUnique({ where: { id } });
  }

  createRule(data: CreateAlertRuleDto): Promise<AlertRuleEntity> {
    return this.prisma.alertRule.create({
      data: data,
    });
  }

  updateRule(id: string, data: UpdateAlertRuleDto): Promise<AlertRuleEntity> {
    return this.prisma.alertRule.update({
      where: { id },
      data: data,
    });
  }

  removeRule(id: string): Promise<AlertRuleEntity> {
    return this.prisma.alertRule.delete({ where: { id } });
  }
}
