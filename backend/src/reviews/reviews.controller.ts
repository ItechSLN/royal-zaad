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
  AdminReviewsQueryDto,
  CreateReviewsDto,
  ProductReviewsQueryDto,
  ReviewApprovalDto,
  UpdateReviewsDto,
} from './dto/reviews.dto';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Staff } from '../auth/decorators/roles.decorator';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  @Version('1')
  findByProduct(@Query() query: ProductReviewsQueryDto) {
    return this.reviewsService.findByProduct(query.productId, query);
  }

  // Declared before ':id' so it isn't swallowed as an id param.
  @Get('featured')
  @Version('1')
  findFeatured(@Query('limit') limit?: string) {
    const parsed = Number.parseInt(limit ?? '', 10);
    return this.reviewsService.findFeatured(
      Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 50) : 6,
    );
  }

  // Moderation queue. Literal 'admin' segment is declared before ':id' so it
  // isn't swallowed as an id param.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Staff()
  @Get('admin')
  @Version('1')
  findAllForAdmin(@Query() query: AdminReviewsQueryDto) {
    return this.reviewsService.findAllForAdmin(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Staff()
  @Patch('admin/:id/approval')
  @Version('1')
  setApproval(@Param('id') id: string, @Body() data: ReviewApprovalDto) {
    return this.reviewsService.setApproval(id, data.isApproved);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Staff()
  @Delete('admin/:id')
  @Version('1')
  removeAsAdmin(@Param('id') id: string) {
    return this.reviewsService.removeAsAdmin(id);
  }

  /** Public — only approved reviews are reachable by id. */
  @Get(':id')
  @Version('1')
  findOne(@Param('id') id: string) {
    return this.reviewsService.findPublished(id);
  }

  @Post()
  @Version('1')
  @UseGuards(JwtAuthGuard)
  create(@Body() data: CreateReviewsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.reviewsService.create(data, user);
  }

  @Patch(':id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() data: UpdateReviewsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.reviewsService.update(id, data, user);
  }

  @Delete(':id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.reviewsService.remove(id, user);
  }
}
