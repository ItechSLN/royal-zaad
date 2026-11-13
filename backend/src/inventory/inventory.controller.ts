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
  AdjustInventoryDto,
  CreateInventoryDto,
  InventoryQueryDto,
  UpdateInventoryDto,
} from './dto/inventory.dto';
import { InventoryService } from './inventory.service';
import { PaginationQueryDto } from '../common/pagination-query.data';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Staff } from '../auth/decorators/roles.decorator';

@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
@Staff()
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @Version('1')
  findAll(@Query() query: InventoryQueryDto) {
    return this.inventoryService.findAll(query, query.warehouseId, query.state);
  }

  @Get(':id')
  @Version('1')
  findOne(@Param('id') id: string) {
    return this.inventoryService.findOne(id);
  }

  @Post()
  @Version('1')
  create(@Body() data: CreateInventoryDto) {
    return this.inventoryService.create(data);
  }

  @Patch(':id')
  @Version('1')
  update(@Param('id') id: string, @Body() data: UpdateInventoryDto) {
    return this.inventoryService.update(id, data);
  }

  @Post(':id/adjust')
  @Version('1')
  adjust(@Param('id') id: string, @Body() data: AdjustInventoryDto) {
    return this.inventoryService.adjust(id, data);
  }

  @Get(':id/adjustments')
  @Version('1')
  findAdjustments(@Param('id') id: string) {
    return this.inventoryService.findAdjustments(id);
  }

  @Delete(':id')
  @Version('1')
  remove(@Param('id') id: string) {
    return this.inventoryService.remove(id);
  }
}
