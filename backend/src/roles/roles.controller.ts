import {
    Controller, Get, Post, Body, Patch, Param, Delete, Version, UseGuards } from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRolesDto, UpdateRolesDto } from './dto/roles.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, Staff } from '../auth/decorators/roles.decorator';
import { ADMIN_ROLE_NAME } from './roles.constants';

@Controller('roles')
@UseGuards(JwtAuthGuard, RolesGuard)
@Staff()
export class RolesController {
  // Any staff member may read roles (the user screens need them); only an
  // Admin may change them, otherwise any staff role could mint itself power.
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @Roles(ADMIN_ROLE_NAME)
  @Version('1')
  create(@Body() createRolesDto: CreateRolesDto) {
    return this.rolesService.create(createRolesDto);
  }

  @Get()
  @Version('1')
  findAll() {
    return this.rolesService.findAll();
  }

  @Get(':id')
  @Version('1') 
  findOne(@Param('id') id: string) {
    return this.rolesService.findOne(id);
  }

  @Patch(':id')
  @Roles(ADMIN_ROLE_NAME)
  @Version('1')
  update(@Param('id') id: string, @Body() updateRolesDto: UpdateRolesDto) {
    return this.rolesService.update(id, updateRolesDto);
  }

  @Delete(':id')
  @Roles(ADMIN_ROLE_NAME)
  @Version('1')
  remove(@Param('id') id: string) {
    return this.rolesService.remove(id);
  }
}