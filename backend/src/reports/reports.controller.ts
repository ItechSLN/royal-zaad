import { Controller, Get, Version, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Staff } from '../auth/decorators/roles.decorator';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Staff()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  @Version('1')
  getSummary() {
    return this.reportsService.getSummary();
  }
}
