import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BUILT_IN_ROLE_NAMES } from './roles.constants';
import type { CreateRolesDto, UpdateRolesDto } from './dto/roles.dto';
import type { RolesEntity } from './entities/roles.entity';
import { RolesRepository } from './roles.repository';

@Injectable()
export class RolesService {
  constructor(private readonly rolesRepository: RolesRepository) {}

  findAll(): Promise<RolesEntity[]> {
    return this.rolesRepository.findAll();
  }

  async findOne(id: string): Promise<RolesEntity> {
    const role = await this.rolesRepository.findById(id);

    if (!role) {
      throw new NotFoundException(`Role ${id} was not found.`);
    }

    return role;
  }

  create(data: CreateRolesDto): Promise<RolesEntity> {
    return this.rolesRepository.create(data);
  }

  async update(id: string, data: UpdateRolesDto): Promise<RolesEntity> {
    const role = await this.findOne(id);
    if (
      data.name !== undefined &&
      data.name !== role.name &&
      BUILT_IN_ROLE_NAMES.includes(role.name)
    ) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: { name: `The built-in "${role.name}" role cannot be renamed` },
      });
    }
    return this.rolesRepository.update(id, data);
  }

  async remove(id: string): Promise<RolesEntity> {
    const role = await this.findOne(id);
    if (BUILT_IN_ROLE_NAMES.includes(role.name)) {
      throw new BadRequestException({
        message: `The built-in "${role.name}" role cannot be deleted`,
      });
    }

    const members = await this.rolesRepository.countUsers(id);
    if (members > 0) {
      throw new BadRequestException({
        message: `This role is still assigned to ${members} user(s). Reassign them before deleting it.`,
      });
    }
    return this.rolesRepository.remove(id);
  }
}