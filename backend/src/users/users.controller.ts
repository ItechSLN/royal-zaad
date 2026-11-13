import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Version,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CreateUsersDto, UpdateUsersDto } from './dto/users.dto';
import { UsersService } from './users.service';
import { PaginationQueryDto } from '../common/pagination-query.data';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, Staff } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { ADMIN_ROLE_NAME } from '../roles/roles.constants';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Staff()
export class UsersController {
  // Any staff member may read the staff list; creating, editing and deleting
  // accounts (which includes choosing their role) is Admin-only.
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Version('1')
  findAll(@Query() query: PaginationQueryDto) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @Version('1')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @Version('1')
  @Roles(ADMIN_ROLE_NAME)
  create(@Body() data: CreateUsersDto) {
    return this.usersService.create(data);
  }

  @Patch(':id')
  @Version('1')
  @Roles(ADMIN_ROLE_NAME)
  update(
    @Param('id') id: string,
    @Body() data: UpdateUsersDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.usersService.update(id, data, currentUser);
  }

  @Delete(':id')
  @Version('1')
  @Roles(ADMIN_ROLE_NAME)
  remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.usersService.remove(id, currentUser);
  }
}
