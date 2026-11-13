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
  CreatePromotionsDto,
  UpdatePromotionsDto,
} from './dto/promotions.dto';
import { PromotionsService } from './promotions.service';
import { PaginationQueryDto } from '../common/pagination-query.data';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Staff } from '../auth/decorators/roles.decorator';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { isStaffUser } from '../auth/roles.constants';

@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  /** Staff see every promotion; the storefront only sees the ones running now. */
  @Get()
  @Version('1')
  @UseGuards(OptionalJwtAuthGuard)
  findAll(
    @Query() query: PaginationQueryDto,
    @CurrentUser() user: AuthenticatedUser | null,
  ) {
    return this.promotionsService.findAll(query, isStaffUser(user));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Staff()
  @Get(':id')
  @Version('1')
  findOne(@Param('id') id: string) {
    return this.promotionsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Staff()
  @Post()
  @Version('1')
  create(@Body() data: CreatePromotionsDto) {
    return this.promotionsService.create(data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Staff()
  @Patch(':id')
  @Version('1')
  update(@Param('id') id: string, @Body() data: UpdatePromotionsDto) {
    return this.promotionsService.update(id, data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Staff()
  @Delete(':id')
  @Version('1')
  remove(@Param('id') id: string) {
    return this.promotionsService.remove(id);
  }
}
