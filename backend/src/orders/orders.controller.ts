import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  Version,
} from '@nestjs/common';
import {
  CreateOrdersDto,
  QuoteOrderDto,
  UpdateOrdersDto,
} from './dto/orders.dto';
import { OrdersService } from './orders.service';
import { PaginationQueryDto } from '../common/pagination-query.data';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Staff } from '../auth/decorators/roles.decorator';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // NOTE: literal routes ('me', 'me/:id') must be declared before ':id' so
  // Nest's router doesn't swallow them as an id param.
  @Get('me')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  findMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PaginationQueryDto,
  ) {
    return this.ordersService.findAllForCustomer(user, query);
  }

  @Get('me/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  findMineById(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.findOneForCustomer(id, user);
  }

  @Get('track/:orderNumber')
  @Version('1')
  track(@Param('orderNumber') orderNumber: string) {
    return this.ordersService.findByOrderNumber(orderNumber);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Staff()
  @Get()
  @Version('1')
  findAll(@Query() query: PaginationQueryDto) {
    return this.ordersService.findAll(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Staff()
  @Get(':id')
  @Version('1')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Post('quote')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  quote(
    @Body() data: QuoteOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.quote(data, user);
  }

  @Post()
  @Version('1')
  @UseGuards(JwtAuthGuard)
  create(
    @Body() data: CreateOrdersDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.create(data, user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Staff()
  @Patch(':id')
  @Version('1')
  update(@Param('id') id: string, @Body() data: UpdateOrdersDto) {
    return this.ordersService.update(id, data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Staff()
  @Delete(':id')
  @Version('1')
  remove(@Param('id') id: string) {
    return this.ordersService.remove(id);
  }
}
