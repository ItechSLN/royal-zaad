import { NormalizeEmail } from '../../common/normalize-email';
import { PartialType } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { CustomerTier } from '@prisma/client';

export class CreateCustomersDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @NormalizeEmail()
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email is required' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'First name is required' })
  firstName!: string;

  @IsString()
  @IsNotEmpty({ message: 'Last name is required' })
  lastName!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEnum(CustomerTier)
  tier?: CustomerTier;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateCustomersDto extends PartialType(CreateCustomersDto) {}
