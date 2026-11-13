import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Version,
  UseGuards,
} from '@nestjs/common';
import { CreateVariantsDto, UpdateVariantsDto } from './dto/variants.dto';
import { VariantsService } from './variants.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Staff } from '../auth/decorators/roles.decorator';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { isStaffUser } from '../auth/roles.constants';

/** Variants are always addressed through their parent product. */
@Controller()
export class VariantsController {
  constructor(private readonly variantsService: VariantsService) {}

  /** Staff see every variant with cost data; shoppers only live ones, without it. */
  @Get('products/:productId/variants')
  @Version('1')
  @UseGuards(OptionalJwtAuthGuard)
  findForProduct(
    @Param('productId') productId: string,
    @CurrentUser() user: AuthenticatedUser | null,
  ) {
    return this.variantsService.findForProduct(
      productId,
      isStaffUser(user),
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Staff()
  @Post('products/:productId/variants')
  @Version('1')
  create(
    @Param('productId') productId: string,
    @Body() data: CreateVariantsDto,
  ) {
    return this.variantsService.create(productId, data);
  }

  @Get('variants/:id')
  @Version('1')
  @UseGuards(OptionalJwtAuthGuard)
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser | null,
  ) {
    return this.variantsService.findOneForViewer(
      id,
      isStaffUser(user),
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Staff()
  @Patch('variants/:id')
  @Version('1')
  update(@Param('id') id: string, @Body() data: UpdateVariantsDto) {
    return this.variantsService.update(id, data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Staff()
  @Delete('variants/:id')
  @Version('1')
  remove(@Param('id') id: string) {
    return this.variantsService.remove(id);
  }
}
