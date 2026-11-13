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
  CreateReturnsDto,
  ReturnsQueryDto,
  UpdateReturnsDto,
} from './dto/returns.dto';
import { ReturnsService } from './returns.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Staff } from '../auth/decorators/roles.decorator';

@Controller('returns')
@UseGuards(JwtAuthGuard, RolesGuard)
@Staff()
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Get()
  @Version('1')
  findAll(@Query() query: ReturnsQueryDto) {
    return this.returnsService.findAll(query);
  }

  @Get(':id')
  @Version('1')
  findOne(@Param('id') id: string) {
    return this.returnsService.findOne(id);
  }

  @Post()
  @Version('1')
  create(@Body() data: CreateReturnsDto) {
    return this.returnsService.create(data);
  }

  @Patch(':id')
  @Version('1')
  update(@Param('id') id: string, @Body() data: UpdateReturnsDto) {
    return this.returnsService.update(id, data);
  }

  @Delete(':id')
  @Version('1')
  remove(@Param('id') id: string) {
    return this.returnsService.remove(id);
  }
}
