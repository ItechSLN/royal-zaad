import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type {
  CreateCategoriesDto,
  UpdateCategoriesDto,
} from './dto/categories.dto';
import type { CategoriesEntity } from './entities/categories.entity';
import { CategoriesRepository } from './categories.repository';
import type { CategoriesQueryDto } from './dto/categories.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly categoriesRepository: CategoriesRepository) {}

  /**
   * `scope` filters the flat list: `top` for root categories only, `sub` for
   * nested ones, or a parent id to list that category's children.
   */
  async findAll(
    query: CategoriesQueryDto,
    scope?: string,
  ): Promise<{ data: CategoriesEntity[]; meta: any }> {
    const { page, limit } = query;

    const where: Prisma.CategoryWhereInput = {
      ...(scope === 'top'
        ? { parentId: null }
        : scope === 'sub'
          ? { NOT: { parentId: null } }
          : scope
            ? { parentId: scope }
            : {}),
      ...(query.visible === 'true' ? { isVisible: true } : {}),
    };

    const { data, total } = await this.categoriesRepository.findAll(
      page,
      limit,
      where,
    );

    return {
      data: await this.withRollupCounts(data),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  /**
   * A storefront tile for "Honey & Syrups" should count everything in its
   * sub-categories too, not just products mapped straight to the parent.
   */
  private async withRollupCounts(
    categories: CategoriesEntity[],
  ): Promise<CategoriesEntity[]> {
    const parents = categories.filter(
      (c) => !(c as { parentId?: string | null }).parentId,
    );
    if (!parents.length) return categories;

    const [counts, children] = await Promise.all([
      this.categoriesRepository.productCountsByCategory(),
      this.categoriesRepository.childIdsByParent(),
    ]);

    const childrenOf = children.reduce<Record<string, string[]>>((acc, row) => {
      if (!row.parentId) return acc;
      (acc[row.parentId] ??= []).push(row.id);
      return acc;
    }, {});

    return categories.map((category) => {
      const withCount = category as CategoriesEntity & {
        _count?: { products: number; children: number };
        parentId?: string | null;
      };

      if (withCount.parentId || !withCount._count) return category;

      const own = counts[category.id] ?? 0;
      const nested = (childrenOf[category.id] ?? []).reduce(
        (sum, id) => sum + (counts[id] ?? 0),
        0,
      );

      return {
        ...category,
        _count: { ...withCount._count, products: own + nested },
      };
    });
  }

  /** Nested two-level tree backing the AD-06 sidebar and the storefront menu. */
  async findTree(visibleOnly = false) {
    const tree = await this.categoriesRepository.findTree(visibleOnly);

    // A top-level count covers everything held beneath it, as in findAll.
    return tree.map((category) => ({
      ...category,
      _count: {
        ...category._count,
        products:
          category._count.products +
          category.children.reduce((sum, c) => sum + c._count.products, 0),
      },
    }));
  }

  async findOne(id: string): Promise<CategoriesEntity> {
    const category = await this.categoriesRepository.findById(id);

    if (!category) {
      throw new NotFoundException(`Category ${id} was not found.`);
    }

    return category;
  }

  async create(data: CreateCategoriesDto): Promise<CategoriesEntity> {
    await this.assertParentIsValid(data.parentId);
    return this.categoriesRepository.create(data);
  }

  async update(
    id: string,
    data: UpdateCategoriesDto,
  ): Promise<CategoriesEntity> {
    await this.findOne(id);

    if (data.parentId) {
      if (data.parentId === id) {
        throw new BadRequestException('A category cannot be its own parent.');
      }

      await this.assertParentIsValid(data.parentId);

      const children = await this.categoriesRepository.countChildren(id);
      if (children > 0) {
        throw new BadRequestException(
          'A category with sub-categories cannot itself be nested — nesting is limited to two levels.',
        );
      }
    }

    return this.categoriesRepository.update(id, data);
  }

  async setImage(
    id: string,
    file: Express.Multer.File,
  ): Promise<CategoriesEntity> {
    await this.findOne(id);
    return this.categoriesRepository.setImage(id, file);
  }

  async clearImage(id: string): Promise<CategoriesEntity> {
    await this.findOne(id);
    return this.categoriesRepository.clearImage(id);
  }

  async remove(id: string): Promise<CategoriesEntity> {
    await this.findOne(id);

    const [products, children] = await Promise.all([
      this.categoriesRepository.countProducts(id),
      this.categoriesRepository.countChildren(id),
    ]);

    if (products > 0) {
      throw new BadRequestException(
        `Category cannot be deleted while ${products} product(s) are mapped to it.`,
      );
    }

    if (children > 0) {
      throw new BadRequestException(
        `Category cannot be deleted while it holds ${children} sub-categor${children === 1 ? 'y' : 'ies'}.`,
      );
    }

    return this.categoriesRepository.remove(id);
  }

  /** The parent must exist and must itself be top level. */
  private async assertParentIsValid(parentId?: string | null): Promise<void> {
    if (!parentId) return;

    const parent = await this.categoriesRepository.findById(parentId);
    if (!parent) {
      throw new NotFoundException(`Parent category ${parentId} was not found.`);
    }

    if ((parent as { parentId?: string | null }).parentId) {
      throw new BadRequestException(
        'Nesting is limited to two levels — pick a top-level parent.',
      );
    }
  }
}
