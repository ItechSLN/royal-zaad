import { Body, Controller, Delete, Get, Param, Post, UseGuards, Version } from '@nestjs/common';
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/addresses.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@Controller('addresses')
@UseGuards(JwtAuthGuard)
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get()
  @Version('1')
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.addressesService.findAll(user);
  }

  @Post()
  @Version('1')
  create(@Body() data: CreateAddressDto, @CurrentUser() user: AuthenticatedUser) {
    return this.addressesService.create(user, data);
  }

  @Delete(':id')
  @Version('1')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.addressesService.remove(id, user);
  }
}
