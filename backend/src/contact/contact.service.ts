import { Injectable, NotFoundException } from '@nestjs/common';
import { ContactStatus, type Prisma } from '@prisma/client';
import type {
  ContactQueryDto,
  CreateContactDto,
  UpdateContactDto,
} from './dto/contact.dto';
import type { ContactEntity } from './entities/contact.entity';
import { ContactRepository } from './contact.repository';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ContactService {
  constructor(
    private readonly contactRepository: ContactRepository,
    private readonly notifications: NotificationsService,
  ) {}

  async findAll(query: ContactQueryDto) {
    const { page, limit } = query;

    const where: Prisma.ContactMessageWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.topic ? { topic: query.topic } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
              { subject: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    // Tab badges read from the whole table, not the filtered page.
    const [{ data, total }, byStatus] = await Promise.all([
      this.contactRepository.findAll(page, limit, where),
      this.contactRepository.countByStatus(),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
        byStatus,
        newCount: byStatus.NEW ?? 0,
      },
    };
  }

  async findOne(id: string): Promise<ContactEntity> {
    const message = await this.contactRepository.findById(id);
    if (!message) {
      throw new NotFoundException(`Message ${id} was not found.`);
    }
    return message;
  }

  /**
   * Public submission. Raises an admin notification so an enquiry cannot sit
   * unseen in a table nobody opens.
   */
  async create(data: CreateContactDto): Promise<ContactEntity> {
    const message = await this.contactRepository.create(data);

    await this.notifications
      .create({
        title: `New enquiry from ${message.name}`,
        body: message.subject
          ? `${message.subject} — ${message.message.slice(0, 140)}`
          : message.message.slice(0, 180),
        severity: 'INFO',
        meta: `Contact · ${message.topic.toLowerCase()}`,
      })
      .catch(() => undefined);

    return message;
  }

  async update(id: string, data: UpdateContactDto): Promise<ContactEntity> {
    const existing = await this.findOne(id);

    // Stamp the first time a message leaves the NEW state.
    const responded =
      data.status &&
      data.status !== ContactStatus.NEW &&
      existing.status === ContactStatus.NEW &&
      !existing.respondedAt
        ? new Date()
        : undefined;

    return this.contactRepository.update(id, data, responded);
  }

  async remove(id: string): Promise<ContactEntity> {
    await this.findOne(id);
    return this.contactRepository.remove(id);
  }
}
