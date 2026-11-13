import type { Prisma } from '@prisma/client';
import type { PRODUCT_INCLUDE } from '../products.repository';

export type ProductsEntity = Prisma.ProductGetPayload<{
  include: typeof PRODUCT_INCLUDE;
}>;
