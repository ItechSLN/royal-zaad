import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateSettingsDto, UpdateSettingsDto } from './dto/settings.dto';
import type { SettingsEntity } from './entities/settings.entity';

@Injectable()
export class SettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<SettingsEntity[]> {
    return this.prisma.setting.findMany({ orderBy: { key: 'asc' } });
  }

  findById(id: string): Promise<SettingsEntity | null> {
    return this.prisma.setting.findUnique({ where: { id } });
  }

  async create(data: CreateSettingsDto): Promise<SettingsEntity> {
    const existing = await this.prisma.setting.findUnique({ where: { key: data.key } });
    if (existing) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: { key: 'Setting key must be unique' },
      });
    }

    return this.prisma.setting.create({ data });
  }

  update(id: string, data: UpdateSettingsDto): Promise<SettingsEntity> {
    return this.prisma.setting.update({ where: { id }, data });
  }

  remove(id: string): Promise<SettingsEntity> {
    return this.prisma.setting.delete({ where: { id } });
  }
}
