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
  CreateAuditLogDto,
  AuditLogQueryDto,
  UpdateAuditLogDto,
} from './dto/audit-log.dto';
import { AuditLogService } from './audit-log.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, Staff } from '../auth/decorators/roles.decorator';
import { ADMIN_ROLE_NAME } from '../roles/roles.constants';

@Controller('audit-log')
@UseGuards(JwtAuthGuard, RolesGuard)
@Staff()
export class AuditLogController {
  // Staff can read and append; only an Admin may amend or remove history.
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @Version('1')
  findAll(@Query() query: AuditLogQueryDto) {
    return this.auditLogService.findAll(query);
  }

  @Get(':id')
  @Version('1')
  findOne(@Param('id') id: string) {
    return this.auditLogService.findOne(id);
  }

  @Post()
  @Version('1')
  create(@Body() data: CreateAuditLogDto) {
    return this.auditLogService.create(data);
  }

  @Patch(':id')
  @Version('1')
  @Roles(ADMIN_ROLE_NAME)
  update(@Param('id') id: string, @Body() data: UpdateAuditLogDto) {
    return this.auditLogService.update(id, data);
  }

  @Delete(':id')
  @Version('1')
  @Roles(ADMIN_ROLE_NAME)
  remove(@Param('id') id: string) {
    return this.auditLogService.remove(id);
  }
}
