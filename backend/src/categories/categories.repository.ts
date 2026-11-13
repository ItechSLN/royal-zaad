import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import type {
  CreateCategoriesDto,
  UpdateCategoriesDto,
} from './dto/categories.dto';
import type { CategoriesEntity } from './entities/categories.entity';

/** Product counts are attached to every row the admin tree renders. */
const WITH_COUNTS = {
  _count: { select: { products: true, children: true } },
} satisfies Prisma.CategoryInclude;

@Injectable()
export class CategoriesRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async findAll(
    page: number,
    limit: number,
    where: Prisma.CategoryWhereInput = {},
  ): Promise<{ data: CategoriesEntity[]; total: number }> {
    const [categories, total] = await Promise.all([
      this.prisma.category.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: WITH_COUNTS,
      }),
      this.prisma.category.count({ where }),
    ]);

    return { data: categories, total };
  }

  /** Two levels deep — the design caps nesting there. */
  findTree(visibleOnly = false) {
    return this.prisma.category.findMany({
      where: { parentId: null, ...(visibleOnly ? { isVisible: true } : {}) },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        ...WITH_COUNTS,
        children: {
          where: visibleOnly ? { isVisible: true } : undefined,
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          include: WITH_COUNTS,
        },
      },
    });
  }

  findById(id: string): Promise<CategoriesEntity | null> {
    return this.prisma.category.findUnique({
      where: { id },
      include: {
        ...WITH_COUNTS,
        parent: true,
        children: { orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] },
      },
    });
  }

  /**
   * Products per category id, so a top-level category can report everything
   * held beneath it rather than only what is mapped directly to it.
   */
  async productCountsByCategory(): Promise<Record<string, number>> {
    const rows = await this.prisma.product.groupBy({
      by: ['categoryId'],
      _count: { _all: true },
    });

    return rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.categoryId] = row._count._all;
      return acc;
    }, {});
  }

  childIdsByParent(): Promise<{ id: string; parentId: string | null }[]> {
    return this.prisma.category.findMany({
      where: { NOT: { parentId: null } },
      select: { id: true, parentId: true },
    });
  }

  findBySlug(slug: string): Promise<CategoriesEntity | null> {
    return this.prisma.category.findUnique({ where: { slug } });
  }

  create(data: CreateCategoriesDto): Promise<CategoriesEntity> {
    return this.prisma.category.create({
      data: data,
    });
  }

  update(id: string, data: UpdateCategoriesDto): Promise<CategoriesEntity> {
    return this.prisma.category.update({
      where: { id },
      data: data,
    });
  }

  remove(id: string): Promise<CategoriesEntity> {
    return this.prisma.category.delete({ where: { id } });
  }

  /**
   * Uploads the artwork and swaps it in, discarding whatever it replaced so the
   * media library does not accumulate orphans.
   */
  async setImage(
    id: string,
    file: Express.Multer.File,
  ): Promise<CategoriesEntity> {
    const current = await this.prisma.category.findUnique({
      where: { id },
      select: { imagePublicId: true },
    });

    const uploaded = await this.cloudinary.upload(file, 'categories');

    const category = await this.prisma.category.update({
      where: { id },
      data: {
        imageUrl: uploaded.secure_url,
        imagePublicId: uploaded.public_id,
      },
    });

    if (current?.imagePublicId) {
      await this.cloudinary
        .remove(current.imagePublicId)
        .catch(() => undefined);
    }

    return category;
  }

  async clearImage(id: string): Promise<CategoriesEntity> {
    const current = await this.prisma.category.findUnique({
      where: { id },
      select: { imagePublicId: true },
    });

    const category = await this.prisma.category.update({
      where: { id },
      data: { imageUrl: null, imagePublicId: null },
    });

    // Only Cloudinary-hosted artwork needs removing; pasted URLs are not ours.
    if (current?.imagePublicId) {
      await this.cloudinary
        .remove(current.imagePublicId)
        .catch(() => undefined);
    }

    return category;
  }

  countProducts(id: string): Promise<number> {
    return this.prisma.product.count({ where: { categoryId: id } });
  }

  countChildren(id: string): Promise<number> {
    return this.prisma.category.count({ where: { parentId: id } });
  }
}
