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
  CreateCampaignsDto,
  CampaignsQueryDto,
  UpdateCampaignsDto,
} from './dto/campaigns.dto';
import { CampaignsService } from './campaigns.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Staff } from '../auth/decorators/roles.decorator';

@Controller('campaigns')
@UseGuards(JwtAuthGuard, RolesGuard)
@Staff()
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get()
  @Version('1')
  findAll(@Query() query: CampaignsQueryDto) {
    return this.campaignsService.findAll(query);
  }

  @Get(':id')
  @Version('1')
  findOne(@Param('id') id: string) {
    return this.campaignsService.findOne(id);
  }

  @Post()
  @Version('1')
  create(@Body() data: CreateCampaignsDto) {
    return this.campaignsService.create(data);
  }

  @Patch(':id')
  @Version('1')
  update(@Param('id') id: string, @Body() data: UpdateCampaignsDto) {
    return this.campaignsService.update(id, data);
  }

  @Delete(':id')
  @Version('1')
  remove(@Param('id') id: string) {
    return this.campaignsService.remove(id);
  }
}
