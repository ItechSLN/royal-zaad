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
  CreateStockTransferDto,
  CreateWarehousesDto,
  UpdateStockTransferDto,
  UpdateWarehousesDto,
  WarehousesQueryDto,
} from './dto/warehouses.dto';
import { PaginationQueryDto } from '../common/pagination-query.data';
import { WarehousesService } from './warehouses.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Staff } from '../auth/decorators/roles.decorator';

@Controller('warehouses')
@UseGuards(JwtAuthGuard, RolesGuard)
@Staff()
export class WarehousesController {
  constructor(private readonly warehousesService: WarehousesService) {}

  @Get()
  @Version('1')
  findAll(@Query() query: WarehousesQueryDto) {
    return this.warehousesService.findAll(query);
  }

  @Get('transfers')
  @Version('1')
  findAllTransfers(@Query() query: PaginationQueryDto) {
    return this.warehousesService.findAllTransfers(query);
  }

  @Get('transfers/:id')
  @Version('1')
  findTransfer(@Param('id') id: string) {
    return this.warehousesService.findTransfer(id);
  }

  @Post('transfers')
  @Version('1')
  createTransfer(@Body() data: CreateStockTransferDto) {
    return this.warehousesService.createTransfer(data);
  }

  @Patch('transfers/:id')
  @Version('1')
  updateTransfer(
    @Param('id') id: string,
    @Body() data: UpdateStockTransferDto,
  ) {
    return this.warehousesService.updateTransfer(id, data);
  }

  @Delete('transfers/:id')
  @Version('1')
  removeTransfer(@Param('id') id: string) {
    return this.warehousesService.removeTransfer(id);
  }

  @Get(':id')
  @Version('1')
  findOne(@Param('id') id: string) {
    return this.warehousesService.findOne(id);
  }

  @Post()
  @Version('1')
  create(@Body() data: CreateWarehousesDto) {
    return this.warehousesService.create(data);
  }

  @Patch(':id')
  @Version('1')
  update(@Param('id') id: string, @Body() data: UpdateWarehousesDto) {
    return this.warehousesService.update(id, data);
  }

  @Delete(':id')
  @Version('1')
  remove(@Param('id') id: string) {
    return this.warehousesService.remove(id);
  }
}
