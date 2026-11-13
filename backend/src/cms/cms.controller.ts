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
import { CreateCmsDto, CmsQueryDto, UpdateCmsDto } from './dto/cms.dto';
import { CmsService } from './cms.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Staff } from '../auth/decorators/roles.decorator';

@Controller('cms')
@UseGuards(JwtAuthGuard, RolesGuard)
@Staff()
export class CmsController {
  constructor(private readonly cmsService: CmsService) {}

  @Get()
  @Version('1')
  findAll(@Query() query: CmsQueryDto) {
    return this.cmsService.findAll(query);
  }

  @Get(':id')
  @Version('1')
  findOne(@Param('id') id: string) {
    return this.cmsService.findOne(id);
  }

  @Post()
  @Version('1')
  create(@Body() data: CreateCmsDto) {
    return this.cmsService.create(data);
  }

  @Patch(':id')
  @Version('1')
  update(@Param('id') id: string, @Body() data: UpdateCmsDto) {
    return this.cmsService.update(id, data);
  }

  @Delete(':id')
  @Version('1')
  remove(@Param('id') id: string) {
    return this.cmsService.remove(id);
  }
}
