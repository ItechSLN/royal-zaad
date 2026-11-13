import type { Prisma } from '@prisma/client';

export type ReviewsEntity = Prisma.ReviewGetPayload<{
  include: { customer: { select: { id: true; firstName: true; lastName: true } } };
}>;
