import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
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
import { NotificationsRepository } from './notifications.repository';
import type { NotificationsQueryDto } from './dto/notifications.dto';
import { PaginationQueryDto } from '../common/pagination-query.data';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly notificationsRepository: NotificationsRepository,
  ) {}

  /**
   * `filter` mirrors the AD-21 tabs: unread, critical or everything.
   * Unread and critical counts ride along in the meta so the tab badges and
   * KPI row can be rendered from a single request.
   */
  async findAll(query: NotificationsQueryDto, filter?: string) {
    const { page, limit } = query;

    const where: Prisma.NotificationWhereInput =
      filter === 'unread'
        ? { unread: true }
        : filter === 'critical'
          ? { severity: 'CRITICAL' }
          : {};

    const [{ data, total }, unreadCount, criticalCount] = await Promise.all([
      this.notificationsRepository.findAll(page, limit, where),
      this.notificationsRepository.countUnread(),
      this.notificationsRepository.countCritical(),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
        unreadCount,
        criticalCount,
      },
    };
  }

  async findOne(id: string): Promise<NotificationsEntity> {
    const record = await this.notificationsRepository.findById(id);
    if (!record) {
      throw new NotFoundException(`Notification ${id} was not found.`);
    }
    return record;
  }

  create(data: CreateNotificationsDto): Promise<NotificationsEntity> {
    return this.notificationsRepository.create(data);
  }

  async update(
    id: string,
    data: UpdateNotificationsDto,
  ): Promise<NotificationsEntity> {
    await this.findOne(id);
    return this.notificationsRepository.update(id, data);
  }

  async markRead(id: string): Promise<NotificationsEntity> {
    await this.findOne(id);
    return this.notificationsRepository.update(id, { unread: false });
  }

  markAllRead(): Promise<{ count: number }> {
    return this.notificationsRepository.markAllRead();
  }

  async remove(id: string): Promise<NotificationsEntity> {
    await this.findOne(id);
    return this.notificationsRepository.remove(id);
  }

  /* ── alert rules ── */

  async findAllRules(query: PaginationQueryDto) {
    const { page, limit } = query;
    const { data, total } = await this.notificationsRepository.findAllRules(
      page,
      limit,
    );

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async findRule(id: string): Promise<AlertRuleEntity> {
    const rule = await this.notificationsRepository.findRuleById(id);
    if (!rule) throw new NotFoundException(`Alert rule ${id} was not found.`);
    return rule;
  }

  createRule(data: CreateAlertRuleDto): Promise<AlertRuleEntity> {
    return this.notificationsRepository.createRule(data);
  }

  async updateRule(
    id: string,
    data: UpdateAlertRuleDto,
  ): Promise<AlertRuleEntity> {
    await this.findRule(id);
    return this.notificationsRepository.updateRule(id, data);
  }

  async removeRule(id: string): Promise<AlertRuleEntity> {
    await this.findRule(id);
    return this.notificationsRepository.removeRule(id);
  }
}
