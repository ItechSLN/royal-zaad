import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GeocoderService } from '../geo/geocoder.service';
import { publicShop, SHOP_SUMMARY_SELECT } from '../marketplace/marketplace.constants';
import { SearchRepository, type SearchRow } from './search.repository';
import { rank, rankingConfigFromEnv, type SortMode } from './ranking';
import type { GeoLookupQueryDto, NearbyShopsQueryDto, SearchProductsQueryDto } from './dto/search.dto';

const round = (n: number, dp = 2) => Math.round(n * 10 ** dp) / 10 ** dp;

@Injectable()
export class SearchService {
  private readonly ranking = rankingConfigFromEnv();

  constructor(
    private readonly repository: SearchRepository,
    private readonly prisma: PrismaService,
    private readonly geocoder: GeocoderService,
  ) {}

  /**
   * Marketplace product search. Works with or without a customer location;
   * without one (e.g. permission denied) results rank by relevance alone.
   */
  async search(query: SearchProductsQueryDto) {
    const located = query.lat !== undefined && query.lng !== undefined;
    if (query.radiusKm !== undefined && !located) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: { radiusKm: 'Choose a location to search within a distance' },
      });
    }
    const sort: SortMode = query.sort ?? 'relevance';
    if (sort === 'nearest' && !located) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: { sort: 'Choose a location to sort by distance' },
      });
    }

    const { rows, capped } = await this.repository.candidates(query, sort, this.ranking);
    const effective = await this.effectivePrices(rows);

    const ranked = rank(
      rows.map((row) => ({ ...row, price: effective.get(row.id) ?? row.price })),
      { hasQuery: !!query.q?.trim(), sort, config: this.ranking },
    );

    const { page, limit } = query;
    const pageRows = ranked.slice((page - 1) * limit, page * limit);
    const products = await this.prisma.product.findMany({
      where: { id: { in: pageRows.map((r) => r.id) } },
      select: {
        id: true,
        name: true,
        slug: true,
        shortDescription: true,
        price: true,
        compareAtPrice: true,
        barcode: true,
        images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1, select: { url: true } },
        category: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
        shop: { select: { ...SHOP_SUMMARY_SELECT, deliveryRadiusKm: true } },
      },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    const data = pageRows.flatMap((row) => {
      const product = byId.get(row.id);
      if (!product) return [];
      const { deliveryRadiusKm, ...shop } = product.shop;
      const listPrice = Number(product.price);
      const promoted = row.price < listPrice;
      return [
        {
          ...product,
          shop: publicShop(shop),
          price: row.price,
          compareAtPrice: promoted
            ? Math.max(listPrice, Number(product.compareAtPrice ?? 0))
            : product.compareAtPrice,
          available: row.available,
          rating: row.rating === null ? null : round(row.rating, 1),
          reviewCount: row.reviewCount,
          distanceKm: row.distanceKm === null ? null : round(row.distanceKm, 1),
          // Only knowable with a customer location and a verified shop location.
          deliversToYou:
            !shop.offersDelivery
              ? false
              : deliveryRadiusKm === null
                ? true
                : row.distanceKm === null
                  ? null
                  : row.distanceKm <= deliveryRadiusKm,
          relevance: round(row.relevanceRatio, 3),
        },
      ];
    });

    return {
      data,
      meta: {
        page,
        limit,
        total: ranked.length,
        totalPages: Math.ceil(ranked.length / limit),
        sort,
        location: located ? { lat: query.lat, lng: query.lng } : null,
        radiusKm: query.radiusKm ?? null,
        capped,
      },
    };
  }

  async nearbyShops(query: NearbyShopsQueryDto) {
    const rows = await this.repository.nearbyShops(query.lat, query.lng, query.radiusKm ?? 25, query.limit ?? 12);
    return rows.map((row) => ({ ...row, distanceKm: round(row.distanceKm, 1) }));
  }

  /** Postcode / city / neighbourhood → a point the storefront can search from. */
  async lookup(query: GeoLookupQueryDto) {
    const hit = await this.geocoder.geocode({ text: query.q, country: query.country?.toUpperCase() });
    if (!hit) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: { q: "We couldn't find that place — try a city or postcode" },
      });
    }
    return hit;
  }

  /** Best live promotion per candidate, in one query (same maths as checkout). */
  private async effectivePrices(rows: SearchRow[]) {
    const promotions = await this.repository.activePromotions(rows.map((r) => r.id));
    const prices = new Map<string, number>();
    const listPrice = new Map(rows.map((r) => [r.id, r.price]));

    for (const promo of promotions) {
      for (const { id } of promo.products) {
        const unit = listPrice.get(id) ?? 0;
        const discount =
          promo.discountType === 'PERCENTAGE'
            ? Math.round(unit * (Number(promo.discountValue) / 100) * 100) / 100
            : Math.min(Number(promo.discountValue), unit);
        const price = Math.max(0, round(unit - discount));
        prices.set(id, Math.min(prices.get(id) ?? unit, price));
      }
    }
    return prices;
  }
}
