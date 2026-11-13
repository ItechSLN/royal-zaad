import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  SELLABLE_PRODUCT_WHERE,
  SELLING_SHOP_WHERE,
  SHOP_SUMMARY_SELECT,
  publicShop,
} from '../marketplace/marketplace.constants';

@Injectable()
export class PublicShopsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * A shop's public profile. Only active shops of approved vendors exist for
   * customers; vendor account data, commission and unverified coordinates are
   * never returned.
   */
  async findBySlug(slug: string) {
    const shop = await this.prisma.shop.findFirst({
      where: { slug, ...SELLING_SHOP_WHERE },
      select: {
        ...SHOP_SUMMARY_SELECT,
        description: true,
        email: true,
        phone: true,
        state: true,
        openingHours: true,
        deliveryRadiusKm: true,
        shippingFlatFee: true,
        freeShippingOver: true,
        createdAt: true,
      },
    });
    if (!shop) throw new NotFoundException('Shop not found');

    const sellable = { shopId: shop.id, ...SELLABLE_PRODUCT_WHERE };
    const [productCount, reviews] = await Promise.all([
      this.prisma.product.count({ where: sellable }),
      this.prisma.review.aggregate({
        where: { isApproved: true, product: sellable },
        _avg: { rating: true },
        _count: { _all: true },
      }),
    ]);

    const { shippingFlatFee, freeShippingOver, ...rest } = shop;
    const avg = reviews._avg.rating;
    // publicShop() nulls coordinates unless the location was verified.
    const { latitude, longitude } = publicShop(rest);
    const { latitude: _lat, longitude: _lng, locationVerifiedAt: _verified, ...profile } = rest;
    return {
      ...profile,
      latitude,
      longitude,
      shippingFlatFee: shippingFlatFee === null ? null : Number(shippingFlatFee),
      freeShippingOver: freeShippingOver === null ? null : Number(freeShippingOver),
      rating: avg === null ? null : Math.round(avg * 10) / 10,
      reviewCount: reviews._count._all,
      productCount,
    };
  }
}
