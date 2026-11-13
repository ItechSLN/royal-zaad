import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { UpdateReviewsDto } from './dto/reviews.dto';
import type { ReviewsEntity } from './entities/reviews.entity';

const REVIEW_INCLUDE = {
  customer: { select: { id: true, firstName: true, lastName: true } },
} as const;

const ADMIN_REVIEW_INCLUDE = {
  customer: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  product: { select: { id: true, name: true, sku: true } },
} as const;

@Injectable()
export class ReviewsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findFeatured(limit: number) {
    return this.prisma.review.findMany({
      where: { isApproved: true, rating: { gte: 4 }, content: { not: null } },
      take: limit,
      orderBy: [{ rating: 'desc' }, { createdAt: 'desc' }],
      include: {
        customer: { select: { id: true, firstName: true, lastName: true } },
        product: { select: { id: true, name: true } },
      },
    });
  }

  async findByProduct(
    productId: string,
    page: number,
    limit: number,
  ): Promise<{ data: ReviewsEntity[]; total: number; averageRating: number }> {
    const where = { productId, isApproved: true };

    const [data, total, aggregate] = await Promise.all([
      this.prisma.review.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: REVIEW_INCLUDE,
      }),
      this.prisma.review.count({ where }),
      this.prisma.review.aggregate({ where, _avg: { rating: true } }),
    ]);

    return {
      data,
      total,
      averageRating: Math.round((aggregate._avg.rating ?? 0) * 10) / 10,
    };
  }

  async findAllForAdmin(
    page: number,
    limit: number,
    filters: { productId?: string; isApproved?: boolean; rating?: number },
  ): Promise<{ data: ReviewsEntity[]; total: number; pendingCount: number }> {
    const where = {
      ...(filters.productId ? { productId: filters.productId } : {}),
      ...(filters.isApproved === undefined ? {} : { isApproved: filters.isApproved }),
      ...(filters.rating ? { rating: filters.rating } : {}),
    };

    const [data, total, pendingCount] = await Promise.all([
      this.prisma.review.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ isApproved: 'asc' }, { createdAt: 'desc' }],
        include: ADMIN_REVIEW_INCLUDE,
      }),
      this.prisma.review.count({ where }),
      this.prisma.review.count({ where: { isApproved: false } }),
    ]);

    return { data, total, pendingCount };
  }

  setApproval(id: string, isApproved: boolean): Promise<ReviewsEntity> {
    return this.prisma.review.update({
      where: { id },
      data: { isApproved },
      include: ADMIN_REVIEW_INCLUDE,
    });
  }

  findById(id: string): Promise<ReviewsEntity | null> {
    return this.prisma.review.findUnique({ where: { id }, include: REVIEW_INCLUDE });
  }

  findByCustomerAndProduct(customerId: string, productId: string): Promise<ReviewsEntity | null> {
    return this.prisma.review.findUnique({
      where: { productId_customerId: { productId, customerId } },
      include: REVIEW_INCLUDE,
    });
  }

  create(data: { productId: string; customerId: string; rating: number; title?: string; content?: string }): Promise<ReviewsEntity> {
    // New reviews land in the moderation queue; an admin approves them before
    // they become visible on the storefront (findByProduct filters isApproved).
    return this.prisma.review.create({
      data: { ...data, isApproved: false },
      include: REVIEW_INCLUDE,
    });
  }

  update(id: string, data: UpdateReviewsDto): Promise<ReviewsEntity> {
    // Edited text has not been moderated, so it goes back into the queue.
    return this.prisma.review.update({
      where: { id },
      data: { ...data, isApproved: false },
      include: REVIEW_INCLUDE,
    });
  }

  remove(id: string): Promise<ReviewsEntity> {
    return this.prisma.review.delete({ where: { id }, include: REVIEW_INCLUDE });
  }
}
