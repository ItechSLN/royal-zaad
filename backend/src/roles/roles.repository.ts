import {Injectable, BadRequestException} from '@nestjs/common';
import type {Prisma} from '@prisma/client';
import {PrismaService} from '../prisma/prisma.service';
import type {CreateRolesDto, UpdateRolesDto} from './dto/roles.dto';
import type {RolesEntity} from './entities/roles.entity';

@Injectable()
export class RolesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<RolesEntity[]> {
    return this.prisma.role.findMany();
  }

  findById(id: string): Promise<RolesEntity | null> {
    return this.prisma.role.findUnique({where: {id}});
  }

  async create(data: CreateRolesDto): Promise<RolesEntity> {
    const existingRole = await this.prisma.role.findUnique({where: {name: data.name}});
    if (existingRole) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: {name: 'Role name must be unique'}
      });
    }

    return this.prisma.role.create({
      data: data as Prisma.RoleUncheckedCreateInput,
    });
  }

  update(id: string, data: UpdateRolesDto): Promise<RolesEntity> {
    return this.prisma.role.update({
      where: {id},
      data: data as Prisma.RoleUncheckedUpdateInput,
    });
  }

  countUsers(roleId: string): Promise<number> {
    return this.prisma.user.count({where: {roleId}});
  }

  remove(id: string): Promise<RolesEntity> {
    return this.prisma.role.delete({where: {id}});
  }
}