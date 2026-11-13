import { BadRequestException, Injectable } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { GeocoderService } from '../geo/geocoder.service';
import { VENDOR_ROLE_NAME } from '../auth/roles.constants';
import type { RegisterVendorDto } from './dto/vendor.dto';

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'shop';

@Injectable()
export class VendorOnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly geocoder: GeocoderService,
  ) {}

  /**
   * Creates the shop owner's account, vendor profile (PENDING — an admin
   * approves it before anything can sell) and shop in one transaction, then
   * emails a confirmation link. Returns a session so they can finish setup.
   */
  async register(data: RegisterVendorDto) {
    const taken = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (taken) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: { email: 'An account with this email already exists' },
      });
    }

    const role = await this.prisma.role.findFirst({
      where: { name: VENDOR_ROLE_NAME, kind: 'VENDOR' },
    });
    if (!role) {
      throw new BadRequestException({ message: 'Vendor sign-up is not configured' });
    }

    const location = await this.geocoder.geocode(data);
    const passwordHash = await bcrypt.hash(data.password, 10);
    const slug = await this.uniqueSlug(data.shopName);

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: data.email,
          passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          roleId: role.id,
        },
        include: { role: true },
      });

      await tx.vendor.create({
        data: {
          userId: created.id,
          status: 'PENDING',
          shop: {
            create: {
              name: data.shopName,
              slug,
              description: data.description,
              email: data.email,
              phone: data.phone,
              addressLine1: data.addressLine1,
              addressLine2: data.addressLine2,
              city: data.city,
              state: data.state,
              postalCode: data.postalCode,
              country: data.country,
              latitude: location?.latitude,
              longitude: location?.longitude,
              locationVerifiedAt: location ? new Date() : null,
            },
          },
        },
      });

      return created;
    });

    const verification = await this.authService.sendVerification(user.id);
    const session = await this.authService.sessionFor(user);
    return { ...session, vendorStatus: 'PENDING', shopSlug: slug, ...verification };
  }

  private async uniqueSlug(name: string) {
    const base = slugify(name);
    for (let n = 0; n < 50; n++) {
      const candidate = n === 0 ? base : `${base}-${n + 1}`;
      if (!(await this.prisma.shop.findUnique({ where: { slug: candidate } }))) return candidate;
    }
    return `${base}-${Date.now().toString(36)}`;
  }
}
