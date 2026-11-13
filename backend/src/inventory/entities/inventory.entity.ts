import type { Prisma } from '@prisma/client';

export type InventoryEntity = Prisma.InventoryGetPayload<{
  include: { product: { select: { id: true; name: true; sku: true } } };
}>;
