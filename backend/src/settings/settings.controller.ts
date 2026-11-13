import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Version,
  UseGuards,
} from '@nestjs/common';
import { CreateSettingsDto, UpdateSettingsDto } from './dto/settings.dto';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, Staff } from '../auth/decorators/roles.decorator';
import { ADMIN_ROLE_NAME } from '../roles/roles.constants';

@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Staff()
export class SettingsController {
  // Settings drive checkout pricing, so only an Admin may change them.
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @Version('1')
  findAll() {
    return this.settingsService.findAll();
  }

  @Get(':id')
  @Version('1')
  findOne(@Param('id') id: string) {
    return this.settingsService.findOne(id);
  }

  @Post()
  @Version('1')
  @Roles(ADMIN_ROLE_NAME)
  create(@Body() data: CreateSettingsDto) {
    return this.settingsService.create(data);
  }

  @Patch(':id')
  @Version('1')
  @Roles(ADMIN_ROLE_NAME)
  update(@Param('id') id: string, @Body() data: UpdateSettingsDto) {
    return this.settingsService.update(id, data);
  }

  @Delete(':id')
  @Version('1')
  @Roles(ADMIN_ROLE_NAME)
  remove(@Param('id') id: string) {
    return this.settingsService.remove(id);
  }
}
