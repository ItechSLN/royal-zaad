import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CreateTaxFilingDto,
  CreateTaxRateDto,
  UpdateTaxFilingDto,
  UpdateTaxRateDto,
} from './dto/tax.dto';
import type { TaxFilingEntity, TaxRateEntity } from './entities/tax.entity';

@Injectable()
export class TaxRepository {
  constructor(private readonly prisma: PrismaService) {}

  /* ── rates ── */

  async findAllRates(
    page: number,
    limit: number,
  ): Promise<{ data: TaxRateEntity[]; total: number }> {
    const [data, total] = await Promise.all([
      this.prisma.taxRate.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { jurisdiction: 'asc' },
      }),
      this.prisma.taxRate.count(),
    ]);

    return { data, total };
  }

  findRateById(id: string): Promise<TaxRateEntity | null> {
    return this.prisma.taxRate.findUnique({ where: { id } });
  }

  createRate(data: CreateTaxRateDto): Promise<TaxRateEntity> {
    return this.prisma.taxRate.create({
      data: data,
    });
  }

  updateRate(id: string, data: UpdateTaxRateDto): Promise<TaxRateEntity> {
    return this.prisma.taxRate.update({
      where: { id },
      data: data,
    });
  }

  removeRate(id: string): Promise<TaxRateEntity> {
    return this.prisma.taxRate.delete({ where: { id } });
  }

  /* ── filings ── */

  async findAllFilings(
    page: number,
    limit: number,
    where: Prisma.TaxFilingWhereInput = {},
  ): Promise<{ data: TaxFilingEntity[]; total: number }> {
    const [data, total] = await Promise.all([
      this.prisma.taxFiling.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { dueAt: 'desc' },
      }),
      this.prisma.taxFiling.count({ where }),
    ]);

    return { data, total };
  }

  findFilingById(id: string): Promise<TaxFilingEntity | null> {
    return this.prisma.taxFiling.findUnique({ where: { id } });
  }

  findActiveRateFor(countryCode: string, excludeId?: string) {
    return this.prisma.taxRate.findFirst({
      where: {
        countryCode,
        isActive: true,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
  }

  createFiling(
    data: CreateTaxFilingDto & { filedAt?: Date },
  ): Promise<TaxFilingEntity> {
    return this.prisma.taxFiling.create({
      data: data,
    });
  }

  updateFiling(
    id: string,
    data: UpdateTaxFilingDto & { filedAt?: Date },
  ): Promise<TaxFilingEntity> {
    return this.prisma.taxFiling.update({
      where: { id },
      data: data,
    });
  }

  removeFiling(id: string): Promise<TaxFilingEntity> {
    return this.prisma.taxFiling.delete({ where: { id } });
  }
}
