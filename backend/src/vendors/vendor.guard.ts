import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { VendorStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { isVendorKind } from '../auth/roles.constants';

/** The caller's own vendor account and shop, resolved on the server. */
export type VendorContext = {
  vendorId: string;
  shopId: string;
  status: VendorStatus;
  userId: string;
};

/**
 * Admits vendor accounts only and attaches *their* shop to the request. Every
 * /vendor route reads the shop from here — never from the URL or body — so a
 * vendor can't reach another shop's data by changing an id. Runs after
 * JwtAuthGuard. Pending, rejected and suspended vendors can still sign in to
 * finish their profile; selling is gated elsewhere by vendor status.
 */
@Injectable()
export class VendorGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser; vendor?: VendorContext }>();
    const user = request.user;

    if (!user || !isVendorKind(user.roleKind)) {
      throw new ForbiddenException('This area is for shop owners');
    }

    const vendor = await this.prisma.vendor.findUnique({
      where: { userId: user.id },
      select: { id: true, status: true, shop: { select: { id: true } } },
    });
    if (!vendor?.shop) {
      throw new ForbiddenException('No shop is linked to this account');
    }

    request.vendor = {
      vendorId: vendor.id,
      shopId: vendor.shop.id,
      status: vendor.status,
      userId: user.id,
    };
    return true;
  }
}

export const CurrentVendor = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): VendorContext =>
    ctx.switchToHttp().getRequest<{ vendor: VendorContext }>().vendor,
);
