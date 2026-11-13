import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import type { CreateUsersDto, UpdateUsersDto } from './dto/users.dto';
import type { SafeUsersEntity, UsersEntity } from './entities/users.entity';
import { UsersRepository } from './users.repository';
import { PaginationQueryDto } from '../common/pagination-query.data';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async findAll(query: PaginationQueryDto): Promise<{ data: SafeUsersEntity[]; meta: any }> {
    const { page, limit } = query;

    const { data, total } = await this.usersRepository.findAll(page, limit);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /** The account behind a session token, by its immutable id (or null). */
  findSessionUser(id: string) {
    return this.usersRepository.findById(id);
  }

  async findByEmail(email: string): Promise<UsersEntity | null> {
    return this.usersRepository.findByEmail(email);
  }

  async findOne(id: string): Promise<SafeUsersEntity> {
    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new NotFoundException(`User ${id} was not found.`);
    }

    return user;
  }

  create(data: CreateUsersDto): Promise<SafeUsersEntity> {
    return this.usersRepository.create(data);
  }

  async update(
    id: string,
    data: UpdateUsersDto,
    currentUser?: AuthenticatedUser,
  ): Promise<SafeUsersEntity> {
    const user = await this.findOne(id);

    // An admin cannot demote, suspend or delete themselves: that is how the
    // last admin locks everyone out of the back office.
    if (currentUser?.id === id) {
      if (data.roleId !== undefined && data.roleId !== user.roleId) {
        throw new BadRequestException({
          message: 'Validation failed',
          errors: { roleId: 'You cannot change your own role' },
        });
      }
      if (data.isActive === false) {
        throw new BadRequestException({
          message: 'Validation failed',
          errors: { isActive: 'You cannot deactivate your own account' },
        });
      }
    }

    if (data.email && data.email !== user.email) {
      await this.usersRepository.assertEmailFree(data.email, id);
    }

    return this.usersRepository.update(id, data);
  }

  async remove(
    id: string,
    currentUser?: AuthenticatedUser,
  ): Promise<SafeUsersEntity> {
    await this.findOne(id);

    if (currentUser?.id === id) {
      throw new BadRequestException({
        message: 'You cannot delete your own account',
      });
    }

    if (await this.usersRepository.hasCustomerProfile(id)) {
      throw new BadRequestException({
        message:
          'This account has a customer profile (orders, addresses, wishlist). Deactivate it instead of deleting it.',
      });
    }

    return this.usersRepository.remove(id);
  }
}
