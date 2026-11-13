import type { Prisma } from '@prisma/client';

export type PromotionsEntity = Prisma.PromotionGetPayload<{
  include: { products: { select: { id: true; name: true; sku: true } } };
}>;
