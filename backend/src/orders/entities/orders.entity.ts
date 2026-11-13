import type { Prisma } from '@prisma/client';

export const ORDER_INCLUDE = {
  items: {
    include: {
      product: {
        select: {
          id: true,
          name: true,
          sku: true,
          slug: true,
          images: { where: { isPrimary: true }, take: 1 },
        },
      },
    },
  },
  customer: { select: { id: true, firstName: true, lastName: true, email: true } },
  coupon: true,
  payment: true,
  shippingAddress: true,
  shipments: { orderBy: { createdAt: 'desc' } },
  vendorOrders: {
    orderBy: { createdAt: 'asc' },
    include: {
      shop: { select: { id: true, name: true, slug: true, logoUrl: true, city: true, phone: true } },
      shipments: { orderBy: { createdAt: 'desc' } },
    },
  },
} satisfies Prisma.OrderInclude;

export type OrdersEntity = Prisma.OrderGetPayload<{ include: typeof ORDER_INCLUDE }>;
