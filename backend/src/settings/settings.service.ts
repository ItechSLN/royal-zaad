import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CreateSettingsDto, UpdateSettingsDto } from './dto/settings.dto';
import type { SettingsEntity } from './entities/settings.entity';
import { SettingsRepository } from './settings.repository';

/**
 * Keys whose value is read as a number elsewhere (checkout pricing, stock
 * alerts). A typo here would otherwise be silently replaced by a default.
 */
const NUMERIC_KEYS = new Set([
  'flat_shipping_rate',
  'free_shipping_threshold',
  'low_stock_alert_threshold',
]);

function assertValidValue(key: string, value: string | undefined) {
  if (value === undefined || !NUMERIC_KEYS.has(key)) return;
  const n = Number(value);
  if (value.trim() === '' || !Number.isFinite(n) || n < 0) {
    throw new BadRequestException({
      message: 'Validation failed',
      errors: { value: 'Must be a number of 0 or more' },
    });
  }
}

@Injectable()
export class SettingsService {
  constructor(private readonly settingsRepository: SettingsRepository) {}

  findAll(): Promise<SettingsEntity[]> {
    return this.settingsRepository.findAll();
  }

  async findOne(id: string): Promise<SettingsEntity> {
    const entity = await this.settingsRepository.findById(id);
    if (!entity) {
      throw new NotFoundException(`Settings record ${id} was not found.`);
    }
    return entity;
  }

  create(data: CreateSettingsDto): Promise<SettingsEntity> {
    assertValidValue(data.key, data.value);
    return this.settingsRepository.create(data);
  }

  async update(id: string, data: UpdateSettingsDto): Promise<SettingsEntity> {
    const existing = await this.findOne(id);
    assertValidValue(data.key ?? existing.key, data.value);
    return this.settingsRepository.update(id, data);
  }

  async remove(id: string): Promise<SettingsEntity> {
    await this.findOne(id);
    return this.settingsRepository.remove(id);
  }
}
