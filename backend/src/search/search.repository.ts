import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { SearchProductsQueryDto } from './dto/search.dto';
import type { RankingConfig, SortMode } from './ranking';

/** At most this many matches are ranked; enough for any human browsing session. */
export const CANDIDATE_CAP = 500;

export type SearchRow = {
  id: string;
  price: number;
  createdAt: Date;
  shopId: string;
  relevance: number;
  distanceKm: number | null;
  available: number;
  rating: number | null;
  reviewCount: number;
};

// Stored, trigger-maintained weighted document (GIN-indexed).
const DOCUMENT = Prisma.sql`p."searchVector"`;

@Injectable()
export class SearchRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieval: sellable, matching products with text relevance, stock, rating
   * and (when a point is given) distance to a *verified* shop location —
   * computed in PostgreSQL. A radius filter goes through the GiST index on
   * shop_earth(). Capped at CANDIDATE_CAP by relevance.
   */
  async candidates(
    query: SearchProductsQueryDto,
    sort: SortMode,
    config: RankingConfig,
  ): Promise<{ rows: SearchRow[]; capped: boolean }> {
    const q = query.q?.trim() || null;
    const located = query.lat !== undefined && query.lng !== undefined;
    const point = located ? Prisma.sql`shop_earth(${query.lat}::float8, ${query.lng}::float8)` : null;
    const shopPoint = Prisma.sql`shop_earth(s."latitude", s."longitude")`;
    const shopLocated = Prisma.sql`(s."locationVerifiedAt" IS NOT NULL AND s."latitude" IS NOT NULL AND s."longitude" IS NOT NULL)`;
    const like = q ? `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%` : null;

    const filters: Prisma.Sql[] = [
      // Sellable: same rule as SELLABLE_PRODUCT_WHERE.
      Prisma.sql`p."isActive" = true`,
      Prisma.sql`p."archivedAt" IS NULL`,
      Prisma.sql`p."moderationStatus" = 'APPROVED'`,
      Prisma.sql`s."isActive" = true`,
      Prisma.sql`v."status" = 'ACTIVE'`,
    ];
    // Matching is gathered branch by branch (text, name typos, category,
    // brand) so each uses its own index; one big OR would scan every product.
    const matchIds = q
      ? Prisma.sql`ids AS (
          SELECT "id" FROM "Product" WHERE "searchVector" @@ websearch_to_tsquery('english', ${q})
          UNION
          SELECT "id" FROM "Product" WHERE ${q} <% "name" OR "name" ILIKE ${like}
          UNION
          SELECT p."id" FROM "Product" p
          WHERE p."categoryId" IN (
            SELECT c."id" FROM "Category" c
            LEFT JOIN "Category" pc ON pc."id" = c."parentId"
            WHERE c."name" ILIKE ${like} OR ${q} <% c."name"
               OR pc."name" ILIKE ${like} OR ${q} <% pc."name"
          )
          UNION
          SELECT p."id" FROM "Product" p
          WHERE p."brandId" IN (SELECT b."id" FROM "Brand" b WHERE b."name" ILIKE ${like} OR ${q} <% b."name")
        ),`
      : Prisma.empty;
    if (q) filters.push(Prisma.sql`p."id" IN (SELECT "id" FROM ids)`);
    if (!query.includeOutOfStock) filters.push(Prisma.sql`coalesce(i."quantity" - i."reserved", 0) > 0`);
    if (query.categoryId) {
      // A top-level category includes its sub-categories.
      filters.push(Prisma.sql`p."categoryId" IN (
        SELECT "id" FROM "Category" WHERE "id" = ${query.categoryId} OR "parentId" = ${query.categoryId}
      )`);
    }
    if (query.brandId) filters.push(Prisma.sql`p."brandId" = ${query.brandId}`);
    if (query.shopId) filters.push(Prisma.sql`p."shopId" = ${query.shopId}`);
    if (query.minPrice !== undefined) filters.push(Prisma.sql`p."price" >= ${query.minPrice}`);
    if (query.maxPrice !== undefined) filters.push(Prisma.sql`p."price" <= ${query.maxPrice}`);
    if (query.fulfillment === 'delivery') filters.push(Prisma.sql`s."offersDelivery" = true`);
    if (query.fulfillment === 'pickup') filters.push(Prisma.sql`s."offersPickup" = true`);
    if (query.minRating !== undefined) filters.push(Prisma.sql`coalesce(r.avg, 0) >= ${query.minRating}`);
    if (point && query.radiusKm !== undefined) {
      const metres = query.radiusKm * 1000;
      filters.push(Prisma.sql`${shopLocated}`);
      filters.push(Prisma.sql`earth_box(${point}, ${metres}::float8) @> ${shopPoint}`);
      filters.push(Prisma.sql`earth_distance(${point}, ${shopPoint}) <= ${metres}::float8`);
    }

    // Category and brand similarity are scored once per category/brand (a few
    // dozen rows) in the cat_score / brand_score CTEs, not once per product.
    const relevance = q
      ? Prisma.sql`(
          ts_rank_cd(${DOCUMENT}, websearch_to_tsquery('english', ${q}), 32)
          + 0.6 * word_similarity(${q}, p."name")
          + CASE WHEN p."name" ILIKE ${like} THEN 0.3 ELSE 0 END
          + 0.25 * coalesce(cs.score, 0)
          + 0.25 * coalesce(bs.score, 0)
        )`
      : Prisma.sql`0`;
    const termScores = q
      ? Prisma.sql`cat_score AS (
          SELECT c."id", GREATEST(
            CASE WHEN c."name" ILIKE ${like} OR pc."name" ILIKE ${like} THEN 1 ELSE 0 END,
            word_similarity(${q}, c."name"),
            word_similarity(${q}, coalesce(pc."name", ''))
          ) AS score
          FROM "Category" c LEFT JOIN "Category" pc ON pc."id" = c."parentId"
        ),
        brand_score AS (
          SELECT b."id", GREATEST(
            CASE WHEN b."name" ILIKE ${like} THEN 1 ELSE 0 END,
            word_similarity(${q}, b."name")
          ) AS score
          FROM "Brand" b
        ),`
      : Prisma.empty;
    // Distance is a property of the shop, not the product: computed once per
    // shop in the shop_distance CTE, then joined.
    const distance = point ? Prisma.sql`sd."distanceKm"` : Prisma.sql`NULL`;
    const shopDistance = point
      ? // MATERIALIZED: otherwise PostgreSQL inlines it and evaluates the distance
        // function once per product row instead of once per shop.
        Prisma.sql`shop_distance AS MATERIALIZED (
          SELECT s."id", earth_distance(${point}, ${shopPoint}) / 1000 AS "distanceKm"
          FROM "Shop" s
          WHERE ${shopLocated}
        ),`
      : Prisma.empty;

    // The cap must keep the *right* candidates: with thousands of equally good
    // matches, cutting by relevance alone would drop the shops next door. So
    // the cut uses the same rule as the final ranking (ranking.ts): relevance
    // tier first, then the weighted score with proximity — or distance / price
    // for those sorts. ranking.ts then orders exactly this set.
    const hasQuery = !!q;
    const w = config.weights;
    const [t1, t2] = [config.tierThresholds[0] ?? 0, config.tierThresholds[1] ?? 0];
    const proximity = Prisma.sql`CASE WHEN "distanceKm" IS NULL THEN 0 ELSE 1 / (1 + "distanceKm" / ${config.proximityScaleKm}::float8) END`;
    const tier = Prisma.sql`CASE WHEN ratio >= ${t1}::float8 THEN 0 WHEN ratio >= ${t2}::float8 THEN 1 ELSE 2 END`;
    const score = Prisma.sql`(
      ${w.relevance}::float8 * ratio + ${w.proximity}::float8 * ${proximity}
      + ${w.availability}::float8 * (CASE WHEN available > 0 THEN 1 ELSE 0 END)
      + ${w.rating}::float8 * coalesce(rating, 0) / 5
    )`;
    const orderBy = {
      // (No tier without a query — a bare constant would read as a column position.)
      relevance: hasQuery
        ? Prisma.sql`${tier} ASC, ${score} DESC, "createdAt" DESC`
        : Prisma.sql`${score} DESC, "createdAt" DESC`,
      nearest: Prisma.sql`"distanceKm" ASC NULLS LAST, ratio DESC`,
      price_asc: Prisma.sql`price ASC, ratio DESC`,
      price_desc: Prisma.sql`price DESC, ratio DESC`,
    }[sort];

    const rows = await this.prisma.$queryRaw<SearchRow[]>`
      WITH ${matchIds} ${shopDistance} ${termScores} ratings AS (
        SELECT "productId", avg("rating") AS avg, count(*) AS count
        FROM "Review" WHERE "isApproved" = true
        GROUP BY "productId"
      ),
      matched AS MATERIALIZED (
        SELECT
          p."id", p."price"::float8 AS price, p."createdAt", p."shopId",
          ${relevance}::float8 AS relevance,
          ${distance}::float8 AS "distanceKm",
          coalesce(i."quantity" - i."reserved", 0)::int AS available,
          r.avg::float8 AS rating,
          coalesce(r.count, 0)::int AS "reviewCount"
        FROM "Product" p
        JOIN "Shop" s ON s."id" = p."shopId"
        JOIN "Vendor" v ON v."id" = s."vendorId"
        LEFT JOIN "Inventory" i ON i."productId" = p."id"
        ${q ? Prisma.sql`LEFT JOIN cat_score cs ON cs."id" = p."categoryId" LEFT JOIN brand_score bs ON bs."id" = p."brandId"` : Prisma.empty}
        LEFT JOIN ratings r ON r."productId" = p."id"
        ${point ? Prisma.sql`LEFT JOIN shop_distance sd ON sd."id" = s."id"` : Prisma.empty}
        WHERE ${Prisma.join(filters, ' AND ')}
      ),
      best AS (SELECT max(relevance) AS m FROM matched),
      scored AS (
        SELECT matched.*, CASE WHEN best.m > 0 THEN relevance / best.m ELSE 0 END AS ratio
        FROM matched CROSS JOIN best
      )
      SELECT "id", price, "createdAt", "shopId", relevance, "distanceKm", available, rating, "reviewCount"
      FROM scored
      WHERE ${hasQuery ? Prisma.sql`ratio >= ${config.minRelevanceRatio}::float8` : Prisma.sql`true`}
      ORDER BY ${orderBy}
      LIMIT ${CANDIDATE_CAP + 1}`;

    return { rows: rows.slice(0, CANDIDATE_CAP), capped: rows.length > CANDIDATE_CAP };
  }

  /** Active promotions for these products, for promoted (effective) prices. */
  activePromotions(productIds: string[]) {
    if (!productIds.length) return Promise.resolve([]);
    const now = new Date();
    return this.prisma.promotion.findMany({
      where: {
        isActive: true,
        startsAt: { lte: now },
        endsAt: { gte: now },
        products: { some: { id: { in: productIds } } },
      },
      select: {
        discountType: true,
        discountValue: true,
        products: { where: { id: { in: productIds } }, select: { id: true } },
      },
    });
  }

  /** Selling shops near a point, nearest first (GiST-indexed). */
  nearbyShops(lat: number, lng: number, radiusKm: number, limit: number) {
    const point = Prisma.sql`shop_earth(${lat}::float8, ${lng}::float8)`;
    const shopPoint = Prisma.sql`shop_earth(s."latitude", s."longitude")`;
    const metres = radiusKm * 1000;
    return this.prisma.$queryRaw<
      { id: string; name: string; slug: string; logoUrl: string | null; city: string | null; distanceKm: number; productCount: number; offersDelivery: boolean; offersPickup: boolean; deliveryRadiusKm: number | null }[]
    >`
      SELECT s."id", s."name", s."slug", s."logoUrl", s."city", s."offersDelivery", s."offersPickup", s."deliveryRadiusKm",
        (earth_distance(${point}, ${shopPoint}) / 1000)::float8 AS "distanceKm",
        (SELECT count(*)::int FROM "Product" p WHERE p."shopId" = s."id" AND p."isActive" AND p."archivedAt" IS NULL AND p."moderationStatus" = 'APPROVED') AS "productCount"
      FROM "Shop" s JOIN "Vendor" v ON v."id" = s."vendorId"
      WHERE s."isActive" AND v."status" = 'ACTIVE'
        AND s."locationVerifiedAt" IS NOT NULL AND s."latitude" IS NOT NULL AND s."longitude" IS NOT NULL
        AND earth_box(${point}, ${metres}::float8) @> ${shopPoint}
        AND earth_distance(${point}, ${shopPoint}) <= ${metres}::float8
      ORDER BY "distanceKm" ASC
      LIMIT ${limit}`;
  }
}
