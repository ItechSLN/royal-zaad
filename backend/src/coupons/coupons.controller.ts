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
import { CreateCouponsDto, UpdateCouponsDto, ValidateCouponDto } from './dto/coupons.dto';
import { CouponsService } from './coupons.service';
import { PaginationQueryDto } from '../common/pagination-query.data';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Staff } from '../auth/decorators/roles.decorator';

@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Staff()
  @Get()
  @Version('1')
  findAll(@Query() query: PaginationQueryDto) {
    return this.couponsService.findAll(query);
  }

  // Declared before ':id' so it isn't swallowed as an id param.
  @Get('validate')
  @Version('1')
  validate(@Query() query: ValidateCouponDto) {
    return this.couponsService.preview(query.code, query.subtotal);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Staff()
  @Get(':id')
  @Version('1')
  findOne(@Param('id') id: string) {
    return this.couponsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Staff()
  @Post()
  @Version('1')
  create(@Body() data: CreateCouponsDto) {
    return this.couponsService.create(data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Staff()
  @Patch(':id')
  @Version('1')
  update(@Param('id') id: string, @Body() data: UpdateCouponsDto) {
    return this.couponsService.update(id, data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Staff()
  @Delete(':id')
  @Version('1')
  remove(@Param('id') id: string) {
    return this.couponsService.remove(id);
  }
}
