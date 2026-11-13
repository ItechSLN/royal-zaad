import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import type {
  AddWishlistItemDto,
  ChangePasswordDto,
  UpdateProfileDto,
} from './dto/account.dto';

@Injectable()
export class AccountService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Every read and write here is keyed off the token's user, so a customer can
   * only ever reach their own records.
   */
  private async customerFor(user: AuthenticatedUser) {
    const customer = await this.prisma.customer.findUnique({
      where: { userId: user.id },
    });

    if (!customer) {
      throw new NotFoundException(
        'No customer profile is linked to this account.',
      );
    }

    return customer;
  }

  async profile(user: AuthenticatedUser) {
    const customer = await this.prisma.customer.findUnique({
      where: { userId: user.id },
    });

    return {
      id: user.id,
      email: user.email,
      firstName: customer?.firstName ?? user.firstName,
      lastName: customer?.lastName ?? user.lastName,
      phone: customer?.phone ?? null,
      customerId: customer?.id ?? null,
      memberSince: customer?.createdAt ?? null,
    };
  }

  async updateProfile(user: AuthenticatedUser, data: UpdateProfileDto) {
    if (data.email && data.email !== user.email) {
      // Checked against both tables: a guest customer record (e.g. created by
      // staff) holds its email too, and the mirror below would collide with it.
      const [takenUser, takenCustomer] = await Promise.all([
        this.prisma.user.findUnique({ where: { email: data.email } }),
        this.prisma.customer.findUnique({ where: { email: data.email } }),
      ]);
      if (
        (takenUser && takenUser.id !== user.id) ||
        (takenCustomer && takenCustomer.userId !== user.id)
      ) {
        throw new BadRequestException({
          message: 'Validation failed',
          errors: { email: 'That email is already in use' },
        });
      }
    }

    // Name and email live on the user; the customer record mirrors them so the
    // admin and storefront agree. Both change together or not at all.
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          ...(data.firstName ? { firstName: data.firstName } : {}),
          ...(data.lastName ? { lastName: data.lastName } : {}),
          ...(data.email ? { email: data.email } : {}),
        },
      });

      await tx.customer.updateMany({
        where: { userId: user.id },
        data: {
          ...(data.firstName ? { firstName: data.firstName } : {}),
          ...(data.lastName ? { lastName: data.lastName } : {}),
          ...(data.email ? { email: data.email } : {}),
          ...(data.phone !== undefined ? { phone: data.phone } : {}),
        },
      });
    });

    return this.profile({ ...user, email: data.email ?? user.email });
  }

  async changePassword(user: AuthenticatedUser, data: ChangePasswordDto) {
    const record = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    });

    if (!record) throw new NotFoundException('Account was not found.');

    const matches = await bcrypt.compare(
      data.currentPassword,
      record.passwordHash,
    );

    if (!matches) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: { currentPassword: 'That password is not correct' },
      });
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(data.newPassword, 10) },
    });

    return { status: 'success' };
  }

  /* ── wishlist ── */

  async wishlist(user: AuthenticatedUser) {
    const customer = await this.customerFor(user);

    // Products unpublished after being saved drop out of view (as they do on
    // the storefront) until they are published again.
    return this.prisma.wishlistItem.findMany({
      where: { customerId: customer.id, product: { isActive: true } },
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          omit: { costPrice: true },
          include: {
            images: { where: { isPrimary: true }, take: 1 },
            category: { select: { id: true, name: true } },
            inventory: { select: { quantity: true, reserved: true } },
          },
        },
      },
    });
  }

  async addToWishlist(user: AuthenticatedUser, data: AddWishlistItemDto) {
    const customer = await this.customerFor(user);

    const product = await this.prisma.product.findUnique({
      where: { id: data.productId },
      select: { id: true, isActive: true },
    });
    // Drafts are treated exactly like missing products, as on the storefront.
    if (!product?.isActive) {
      throw new NotFoundException('That product was not found.');
    }

    // Saving twice is a no-op rather than an error.
    return this.prisma.wishlistItem.upsert({
      where: {
        customerId_productId: {
          customerId: customer.id,
          productId: data.productId,
        },
      },
      update: {},
      create: { customerId: customer.id, productId: data.productId },
    });
  }

  async removeFromWishlist(user: AuthenticatedUser, productId: string) {
    const customer = await this.customerFor(user);

    const removed = await this.prisma.wishlistItem.deleteMany({
      where: { customerId: customer.id, productId },
    });

    if (!removed.count) {
      throw new NotFoundException('That product is not in your wishlist.');
    }

    return { status: 'success' };
  }

  /** Counts behind the account overview. */
  async summary(user: AuthenticatedUser) {
    const customer = await this.prisma.customer.findUnique({
      where: { userId: user.id },
    });

    if (!customer) {
      return { orders: 0, wishlist: 0, addresses: 0, totalSpend: '0' };
    }

    const [orders, wishlist, addresses, spend] = await Promise.all([
      this.prisma.order.count({ where: { customerId: customer.id } }),
      this.prisma.wishlistItem.count({
        where: { customerId: customer.id, product: { isActive: true } },
      }),
      this.prisma.address.count({ where: { customerId: customer.id } }),
      this.prisma.order.aggregate({
        where: {
          customerId: customer.id,
          status: { notIn: ['CANCELLED', 'REFUNDED'] },
        },
        _sum: { total: true },
      }),
    ]);

    return {
      orders,
      wishlist,
      addresses,
      totalSpend: (spend._sum.total ?? 0).toString(),
      memberSince: customer.createdAt,
    };
  }
}
