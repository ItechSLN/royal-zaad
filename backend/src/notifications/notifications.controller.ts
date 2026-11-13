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
  CreateAlertRuleDto,
  CreateNotificationsDto,
  NotificationsQueryDto,
  UpdateAlertRuleDto,
  UpdateNotificationsDto,
} from './dto/notifications.dto';
import { NotificationsService } from './notifications.service';
import { PaginationQueryDto } from '../common/pagination-query.data';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Staff } from '../auth/decorators/roles.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Staff()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @Version('1')
  findAll(@Query() query: NotificationsQueryDto) {
    return this.notificationsService.findAll(query, query.filter);
  }

  @Get('rules')
  @Version('1')
  findAllRules(@Query() query: PaginationQueryDto) {
    return this.notificationsService.findAllRules(query);
  }

  @Get('rules/:id')
  @Version('1')
  findRule(@Param('id') id: string) {
    return this.notificationsService.findRule(id);
  }

  @Post('rules')
  @Version('1')
  createRule(@Body() data: CreateAlertRuleDto) {
    return this.notificationsService.createRule(data);
  }

  @Patch('rules/:id')
  @Version('1')
  updateRule(@Param('id') id: string, @Body() data: UpdateAlertRuleDto) {
    return this.notificationsService.updateRule(id, data);
  }

  @Delete('rules/:id')
  @Version('1')
  removeRule(@Param('id') id: string) {
    return this.notificationsService.removeRule(id);
  }

  @Patch('read-all')
  @Version('1')
  markAllRead() {
    return this.notificationsService.markAllRead();
  }

  @Get(':id')
  @Version('1')
  findOne(@Param('id') id: string) {
    return this.notificationsService.findOne(id);
  }

  @Post()
  @Version('1')
  create(@Body() data: CreateNotificationsDto) {
    return this.notificationsService.create(data);
  }

  @Patch(':id/read')
  @Version('1')
  markRead(@Param('id') id: string) {
    return this.notificationsService.markRead(id);
  }

  @Patch(':id')
  @Version('1')
  update(@Param('id') id: string, @Body() data: UpdateNotificationsDto) {
    return this.notificationsService.update(id, data);
  }

  @Delete(':id')
  @Version('1')
  remove(@Param('id') id: string) {
    return this.notificationsService.remove(id);
  }
}
