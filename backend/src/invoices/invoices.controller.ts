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
  CreateInvoicesDto,
  InvoicesQueryDto,
  UpdateInvoicesDto,
} from './dto/invoices.dto';
import { InvoicesService } from './invoices.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Staff } from '../auth/decorators/roles.decorator';

@Controller('invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
@Staff()
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  @Version('1')
  findAll(@Query() query: InvoicesQueryDto) {
    return this.invoicesService.findAll(query);
  }

  @Get(':id')
  @Version('1')
  findOne(@Param('id') id: string) {
    return this.invoicesService.findOne(id);
  }

  @Post()
  @Version('1')
  create(@Body() data: CreateInvoicesDto) {
    return this.invoicesService.create(data);
  }

  @Patch(':id')
  @Version('1')
  update(@Param('id') id: string, @Body() data: UpdateInvoicesDto) {
    return this.invoicesService.update(id, data);
  }

  @Delete(':id')
  @Version('1')
  remove(@Param('id') id: string) {
    return this.invoicesService.remove(id);
  }
}
