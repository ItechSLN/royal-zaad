import type { Prisma } from '@prisma/client';

export type CustomersEntity = Prisma.CustomerGetPayload<{
  include: { addresses: true };
}>;

/** A list row: the customer plus the order stats the list screen shows. */
export type CustomerListRow = CustomersEntity & {
  orderCount: number;
  totalSpend: string;
};
