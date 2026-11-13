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
  CreateCustomersDto,
  UpdateCustomersDto,
} from './dto/customers.dto';
import { CustomersService } from './customers.service';
import { PaginationQueryDto } from '../common/pagination-query.data';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Staff } from '../auth/decorators/roles.decorator';

@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Staff()
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @Version('1')
  findAll(@Query() query: PaginationQueryDto) {
    return this.customersService.findAll(query);
  }

  @Get(':id')
  @Version('1')
  findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  @Post()
  @Version('1')
  create(@Body() data: CreateCustomersDto) {
    return this.customersService.create(data);
  }

  @Patch(':id')
  @Version('1')
  update(@Param('id') id: string, @Body() data: UpdateCustomersDto) {
    return this.customersService.update(id, data);
  }

  @Delete(':id')
  @Version('1')
  remove(@Param('id') id: string) {
    return this.customersService.remove(id);
  }
}
