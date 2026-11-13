import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  AdminReviewsQueryDto,
  CreateReviewsDto,
  UpdateReviewsDto,
} from './dto/reviews.dto';
import type { ReviewsEntity } from './entities/reviews.entity';
import { ReviewsRepository } from './reviews.repository';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationQueryDto } from '../common/pagination-query.data';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly reviewsRepository: ReviewsRepository,
    private readonly prisma: PrismaService,
  ) {}

  async findByProduct(
    productId: string,
    query: PaginationQueryDto,
  ): Promise<{ data: ReviewsEntity[]; meta: any; averageRating: number }> {
    const { page, limit } = query;
    const { data, total, averageRating } = await this.reviewsRepository.findByProduct(productId, page, limit);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      averageRating,
    };
  }

  findFeatured(limit: number) {
    return this.reviewsRepository.findFeatured(limit);
  }

  async findAllForAdmin(
    query: AdminReviewsQueryDto,
  ): Promise<{ data: ReviewsEntity[]; meta: any }> {
    const { page, limit, productId, isApproved, rating } = query;
    const { data, total, pendingCount } =
      await this.reviewsRepository.findAllForAdmin(page, limit, {
        productId,
        isApproved,
        rating,
      });

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        pendingCount,
      },
    };
  }

  async setApproval(id: string, isApproved: boolean): Promise<ReviewsEntity> {
    await this.findOne(id);
    return this.reviewsRepository.setApproval(id, isApproved);
  }

  /** Moderator delete — bypasses the customer-ownership check used by remove(). */
  async removeAsAdmin(id: string): Promise<ReviewsEntity> {
    await this.findOne(id);
    return this.reviewsRepository.remove(id);
  }

  async findPublished(id: string): Promise<ReviewsEntity> {
    const review = await this.reviewsRepository.findById(id);

    if (!review || !review.isApproved) {
      throw new NotFoundException(`Review ${id} was not found.`);
    }

    return review;
  }

  async findOne(id: string): Promise<ReviewsEntity> {
    const review = await this.reviewsRepository.findById(id);

    if (!review) {
      throw new NotFoundException(`Review ${id} was not found.`);
    }

    return review;
  }

  async create(data: CreateReviewsDto, currentUser: AuthenticatedUser): Promise<ReviewsEntity> {
    const customer = await this.prisma.customer.findUnique({ where: { userId: currentUser.id } });
    if (!customer) {
      throw new BadRequestException({ message: 'No customer profile is linked to this account' });
    }

    const purchased = await this.prisma.orderItem.findFirst({
      // Only orders that were confirmed count — not unpaid or cancelled ones.
      where: {
        productId: data.productId,
        order: {
          customerId: customer.id,
          status: { in: ['PROCESSING', 'SHIPPED', 'DELIVERED'] },
        },
      },
    });
    if (!purchased) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: { productId: 'You can only review products you have purchased' },
      });
    }

    const existing = await this.reviewsRepository.findByCustomerAndProduct(customer.id, data.productId);
    if (existing) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: { productId: 'You have already reviewed this product' },
      });
    }

    return this.reviewsRepository.create({
      productId: data.productId,
      customerId: customer.id,
      rating: data.rating,
      title: data.title,
      content: data.content,
    });
  }

  async update(id: string, data: UpdateReviewsDto, currentUser: AuthenticatedUser): Promise<ReviewsEntity> {
    const review = await this.assertOwnership(id, currentUser);
    return this.reviewsRepository.update(review.id, data);
  }

  async remove(id: string, currentUser: AuthenticatedUser): Promise<ReviewsEntity> {
    const review = await this.assertOwnership(id, currentUser);
    return this.reviewsRepository.remove(review.id);
  }

  private async assertOwnership(id: string, currentUser: AuthenticatedUser): Promise<ReviewsEntity> {
    const review = await this.findOne(id);
    const customer = await this.prisma.customer.findUnique({ where: { userId: currentUser.id } });

    if (!customer || review.customerId !== customer.id) {
      throw new ForbiddenException('You do not have access to this review');
    }

    return review;
  }
}
