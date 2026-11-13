import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Version,
  UseGuards,
} from '@nestjs/common';
import {
  CreateTaxFilingDto,
  CreateTaxRateDto,
  TaxFilingsQueryDto,
  UpdateTaxFilingDto,
  UpdateTaxRateDto,
} from './dto/tax.dto';
import { TaxService } from './tax.service';
import { PaginationQueryDto } from '../common/pagination-query.data';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Staff } from '../auth/decorators/roles.decorator';

@Controller('tax')
@UseGuards(JwtAuthGuard, RolesGuard)
@Staff()
export class TaxController {
  constructor(private readonly taxService: TaxService) {}

  /* ── rates ── */

  @Get('rates')
  @Version('1')
  findAllRates(@Query() query: PaginationQueryDto) {
    return this.taxService.findAllRates(query);
  }

  @Get('rates/:id')
  @Version('1')
  findRate(@Param('id') id: string) {
    return this.taxService.findRate(id);
  }

  @Post('rates')
  @Version('1')
  createRate(@Body() data: CreateTaxRateDto) {
    return this.taxService.createRate(data);
  }

  @Patch('rates/:id')
  @Version('1')
  updateRate(@Param('id') id: string, @Body() data: UpdateTaxRateDto) {
    return this.taxService.updateRate(id, data);
  }

  @Delete('rates/:id')
  @Version('1')
  removeRate(@Param('id') id: string) {
    return this.taxService.removeRate(id);
  }

  /* ── filings ── */

  @Get('filings')
  @Version('1')
  findAllFilings(@Query() query: TaxFilingsQueryDto) {
    return this.taxService.findAllFilings(query, query.jurisdiction);
  }

  @Get('filings/:id')
  @Version('1')
  findFiling(@Param('id') id: string) {
    return this.taxService.findFiling(id);
  }

  @Post('filings')
  @Version('1')
  createFiling(@Body() data: CreateTaxFilingDto) {
    return this.taxService.createFiling(data);
  }

  @Patch('filings/:id')
  @Version('1')
  updateFiling(@Param('id') id: string, @Body() data: UpdateTaxFilingDto) {
    return this.taxService.updateFiling(id, data);
  }

  @Post('filings/:id/file')
  @Version('1')
  fileReturn(@Param('id') id: string) {
    return this.taxService.fileReturn(id);
  }

  @Delete('filings/:id')
  @Version('1')
  removeFiling(@Param('id') id: string) {
    return this.taxService.removeFiling(id);
  }
}
