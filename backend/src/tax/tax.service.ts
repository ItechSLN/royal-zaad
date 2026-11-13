import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FilingStatus } from '@prisma/client';
import type {
  CreateTaxFilingDto,
  CreateTaxRateDto,
  UpdateTaxFilingDto,
  UpdateTaxRateDto,
} from './dto/tax.dto';
import type { TaxFilingEntity, TaxRateEntity } from './entities/tax.entity';
import { TaxRepository } from './tax.repository';
import { PaginationQueryDto } from '../common/pagination-query.data';

const round2 = (n: number) => Math.round(n * 100) / 100;

const invalid = (errors: Record<string, string>) =>
  new BadRequestException({ message: 'Validation failed', errors });

@Injectable()
export class TaxService {
  constructor(private readonly taxRepository: TaxRepository) {}

  async findAllRates(query: PaginationQueryDto) {
    const { page, limit } = query;
    const { data, total } = await this.taxRepository.findAllRates(page, limit);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async findRate(id: string): Promise<TaxRateEntity> {
    const rate = await this.taxRepository.findRateById(id);
    if (!rate) throw new NotFoundException(`Tax rate ${id} was not found.`);
    return rate;
  }

  async createRate(data: CreateTaxRateDto): Promise<TaxRateEntity> {
    await this.assertSingleActiveRate(data.countryCode, data.isActive ?? true);
    return this.taxRepository.createRate(data);
  }

  async updateRate(id: string, data: UpdateTaxRateDto): Promise<TaxRateEntity> {
    const existing = await this.findRate(id);
    await this.assertSingleActiveRate(
      data.countryCode ?? existing.countryCode ?? undefined,
      data.isActive ?? existing.isActive,
      id,
    );
    return this.taxRepository.updateRate(id, data);
  }

  /**
   * Checkout picks the active rate for the ship-to country, so two active
   * rates for one country would make the charged tax ambiguous.
   */
  private async assertSingleActiveRate(
    countryCode: string | undefined,
    isActive: boolean,
    excludeId?: string,
  ) {
    if (!countryCode || !isActive) return;
    const clash = await this.taxRepository.findActiveRateFor(countryCode, excludeId);
    if (clash) {
      throw invalid({
        countryCode: `${clash.jurisdiction} is already the active rate for ${countryCode} — deactivate it first`,
      });
    }
  }

  async removeRate(id: string): Promise<TaxRateEntity> {
    await this.findRate(id);
    return this.taxRepository.removeRate(id);
  }

  async findAllFilings(query: PaginationQueryDto, jurisdiction?: string) {
    const { page, limit } = query;
    const { data, total } = await this.taxRepository.findAllFilings(
      page,
      limit,
      jurisdiction
        ? { jurisdiction: { contains: jurisdiction, mode: 'insensitive' } }
        : {},
    );

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async findFiling(id: string): Promise<TaxFilingEntity> {
    const filing = await this.taxRepository.findFilingById(id);
    if (!filing) throw new NotFoundException(`Tax filing ${id} was not found.`);
    return filing;
  }

  /** Net payable is always output tax less reclaimable input tax. */
  createFiling(data: CreateTaxFilingDto): Promise<TaxFilingEntity> {
    const outputTax = data.outputTax ?? 0;
    const inputTax = data.inputTax ?? 0;
    return this.taxRepository.createFiling({
      ...data,
      outputTax,
      inputTax,
      netPayable: round2(outputTax - inputTax),
      ...(data.status === FilingStatus.FILED ? { filedAt: new Date() } : {}),
    });
  }

  /** A filed return has been submitted to the authority and is locked. */
  async updateFiling(
    id: string,
    data: UpdateTaxFilingDto,
  ): Promise<TaxFilingEntity> {
    const existing = await this.findFiling(id);
    if (existing.status === FilingStatus.FILED) {
      throw invalid({ status: 'This return has been filed and can no longer be changed' });
    }

    const outputTax = data.outputTax ?? Number(existing.outputTax);
    const inputTax = data.inputTax ?? Number(existing.inputTax);
    return this.taxRepository.updateFiling(id, {
      ...data,
      netPayable: round2(outputTax - inputTax),
      ...(data.status === FilingStatus.FILED ? { filedAt: new Date() } : {}),
    });
  }

  /** Marks a draft return as filed and stamps the submission time. */
  async fileReturn(id: string): Promise<TaxFilingEntity> {
    const existing = await this.findFiling(id);
    if (existing.status === FilingStatus.FILED) {
      throw invalid({ status: `${existing.period} · ${existing.jurisdiction} is already filed` });
    }
    return this.taxRepository.updateFiling(id, {
      status: FilingStatus.FILED,
      filedAt: new Date(),
    });
  }

  async removeFiling(id: string): Promise<TaxFilingEntity> {
    const existing = await this.findFiling(id);
    if (existing.status === FilingStatus.FILED) {
      throw new BadRequestException('A filed return cannot be deleted.');
    }
    return this.taxRepository.removeFiling(id);
  }
}
