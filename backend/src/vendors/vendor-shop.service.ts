import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GeocoderService } from '../geo/geocoder.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { openingHoursError, type UpdateShopDto } from './dto/vendor.dto';
import type { VendorContext } from './vendor.guard';

const ADDRESS_FIELDS = ['addressLine1', 'addressLine2', 'city', 'state', 'postalCode', 'country'] as const;

@Injectable()
export class VendorShopService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geocoder: GeocoderService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async get(ctx: VendorContext) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: ctx.shopId },
      include: {
        vendor: {
          select: {
            status: true,
            statusReason: true,
            approvedAt: true,
            commissionRate: true,
            user: { select: { email: true, emailVerifiedAt: true } },
          },
        },
      },
    });
    if (!shop) throw new NotFoundException('Shop not found');
    return shop;
  }

  /**
   * Updates the shop profile. Changing the address re-geocodes it: the shop
   * only gets coordinates (and distance search) for an address that locates.
   */
  async update(ctx: VendorContext, data: UpdateShopDto) {
    const current = await this.get(ctx);

    if (data.openingHours !== undefined) {
      const problem = openingHoursError(data.openingHours);
      if (problem) {
        throw new BadRequestException({ message: 'Validation failed', errors: { openingHours: problem } });
      }
    }

    const offersDelivery = data.offersDelivery ?? current.offersDelivery;
    const offersPickup = data.offersPickup ?? current.offersPickup;
    if (!offersDelivery && !offersPickup) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: { offersDelivery: 'Offer delivery, pickup, or both' },
      });
    }

    const { openingHours, ...fields } = data;
    const update: Prisma.ShopUpdateInput = {
      ...fields,
      ...(openingHours !== undefined
        ? { openingHours: openingHours === null ? Prisma.DbNull : (openingHours as Prisma.InputJsonValue) }
        : {}),
    };

    const addressChanged = ADDRESS_FIELDS.some(
      (field) => data[field] !== undefined && data[field] !== current[field],
    );
    let locationMessage: string | undefined;
    if (addressChanged) {
      const merged = { ...current, ...data };
      const hit = await this.geocoder.geocode({
        line1: merged.addressLine1,
        city: merged.city,
        state: merged.state,
        postalCode: merged.postalCode,
        country: merged.country,
      });
      update.latitude = hit?.latitude ?? null;
      update.longitude = hit?.longitude ?? null;
      update.locationVerifiedAt = hit ? new Date() : null;
      locationMessage = hit
        ? `Location set to ${hit.label}`
        : "We couldn't locate this address. Customers won't see your distance until it's corrected or an admin sets it.";
    }

    const shop = await this.prisma.shop.update({ where: { id: ctx.shopId }, data: update });
    return { ...shop, ...(locationMessage ? { locationMessage } : {}) };
  }

  async uploadLogo(ctx: VendorContext, file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException({ message: 'Validation failed', errors: { logo: 'Choose an image' } });
    }
    const current = await this.get(ctx);
    const uploaded = await this.cloudinary.upload(file);
    const shop = await this.prisma.shop.update({
      where: { id: ctx.shopId },
      data: { logoUrl: uploaded.secure_url, logoPublicId: uploaded.public_id },
    });
    if (current.logoPublicId) {
      await this.cloudinary.remove(current.logoPublicId).catch(() => undefined);
    }
    return shop;
  }
}
