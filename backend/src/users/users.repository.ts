import { Injectable, BadRequestException} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateUsersDto, UpdateUsersDto } from './dto/users.dto';
import type { SafeUsersEntity, UsersEntity } from './entities/users.entity';
import bcrypt from "bcrypt";

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page: number, limit: number): Promise<{ data: SafeUsersEntity[]; total: number }> {
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip: (page - 1) * limit,
        take: limit,
        include: {
          role: true,
        },
        omit: {
          passwordHash: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.user.count(),
    ]);

    return {
      data: users,
      total,
    };
  }

  findById(id: string): Promise<SafeUsersEntity | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        role: true,
      },
      omit: {
        passwordHash: true,
      },
    });
  }

  findByEmail(email: string): Promise<UsersEntity | null> {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        role: true,
      },
    });
  }

  async create(data: CreateUsersDto): Promise<SafeUsersEntity> {
    const existingUser = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) {
      throw new BadRequestException({
        message: 'User Already Exists',
        errors: { email: 'Email must be unique' }
      });
    }

    if (data.passwordHash) {
      data.passwordHash = await bcrypt.hash(data.passwordHash, 10);
    }

    return this.prisma.user.create({
      data: data as Prisma.UserUncheckedCreateInput,
      include: {
        role: true,
      },
      omit: {
        passwordHash: true,
      },
    });
  }

  async assertEmailFree(email: string, exceptUserId: string): Promise<void> {
    const [user, customer] = await Promise.all([
      this.prisma.user.findUnique({ where: { email } }),
      this.prisma.customer.findUnique({ where: { email } }),
    ]);
    if (
      (user && user.id !== exceptUserId) ||
      (customer && customer.userId !== exceptUserId)
    ) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: { email: 'Email must be unique' },
      });
    }
  }

  async hasCustomerProfile(userId: string): Promise<boolean> {
    return !!(await this.prisma.customer.findUnique({ where: { userId } }));
  }

  async update(id: string, data: UpdateUsersDto): Promise<SafeUsersEntity> {
    if (data.passwordHash) {
      data.passwordHash = await bcrypt.hash(data.passwordHash, 10);
    }

    // A linked customer record mirrors the login email, so the storefront
    // and the admin agree on who this is.
    if (data.email) {
      const email = data.email;
      return this.prisma.$transaction(async (tx) => {
        const user = await tx.user.update({
          where: { id },
          data: data as Prisma.UserUncheckedUpdateInput,
          include: { role: true },
          omit: { passwordHash: true },
        });
        await tx.customer.updateMany({ where: { userId: id }, data: { email } });
        return user;
      });
    }

    return this.prisma.user.update({
      where: { id },
      data: data as Prisma.UserUncheckedUpdateInput,
      include: {
        role: true,
      },
      omit: {
        passwordHash: true,
      },
    });
  }

  remove(id: string): Promise<SafeUsersEntity> {
    return this.prisma.user.delete({
      where: { id },
      include: {
        role: true,
      },
      omit: {
        passwordHash: true,
      },
    });
  }
}
