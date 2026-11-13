import { NormalizeEmail } from '../../common/normalize-email';
import { PartialType } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEmail, IsBoolean, MinLength } from 'class-validator';

export class CreateUsersDto {
  @IsString()
  @NormalizeEmail()
  @IsEmail({}, {message: 'Invalid email format'})
  @IsNotEmpty({message: 'Email is required'})
  email!: string;

  @MinLength(6, {message: 'Password must be at least 6 characters long'})
  @IsNotEmpty({message: 'Password is required'})
  passwordHash!: string;

  @IsString()
  @IsNotEmpty({message: 'First name is required'})
  firstName!: string;

  @IsString()
  @IsNotEmpty({message: 'Last name is required'})
  lastName!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  department?: string;

  @IsString()
  @IsNotEmpty({message: 'Role ID is required'})
  roleId!: string;
}

export class UpdateUsersDto extends PartialType(CreateUsersDto) {}
