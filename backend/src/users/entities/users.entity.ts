import type { Prisma } from '@prisma/client';

export type UsersEntity = Prisma.UserGetPayload<{ include: { role: true } }>;

export type SafeUsersEntity = Omit<UsersEntity, 'passwordHash'>;
