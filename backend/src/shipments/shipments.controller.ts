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
  CreateShipmentsDto,
  ShipmentsQueryDto,
  UpdateShipmentsDto,
} from './dto/shipments.dto';
import { ShipmentsService } from './shipments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Staff } from '../auth/decorators/roles.decorator';

@Controller('shipments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Staff()
export class ShipmentsController {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  @Get()
  @Version('1')
  findAll(@Query() query: ShipmentsQueryDto) {
    return this.shipmentsService.findAll(query);
  }

  @Get(':id')
  @Version('1')
  findOne(@Param('id') id: string) {
    return this.shipmentsService.findOne(id);
  }

  @Post()
  @Version('1')
  create(@Body() data: CreateShipmentsDto) {
    return this.shipmentsService.create(data);
  }

  @Patch(':id')
  @Version('1')
  update(@Param('id') id: string, @Body() data: UpdateShipmentsDto) {
    return this.shipmentsService.update(id, data);
  }

  @Delete(':id')
  @Version('1')
  remove(@Param('id') id: string) {
    return this.shipmentsService.remove(id);
  }
}
