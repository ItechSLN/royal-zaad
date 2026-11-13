import { NormalizeEmail } from '../../common/normalize-email';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @MaxLength(80)
  @IsNotEmpty({ message: 'First name cannot be blank' })
  @IsString()
  firstName?: string;

  @IsOptional()
  @MaxLength(80)
  @IsNotEmpty({ message: 'Last name cannot be blank' })
  @IsString()
  lastName?: string;

  @IsOptional()
  @NormalizeEmail()
  @IsEmail({}, { message: 'Enter a valid email address' })
  email?: string;

  @IsOptional()
  @MaxLength(40)
  @IsString()
  phone?: string;
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Enter your current password' })
  currentPassword!: string;

  @MinLength(6, { message: 'New password must be at least 6 characters' })
  @IsString()
  @IsNotEmpty({ message: 'Enter a new password' })
  newPassword!: string;
}

export class AddWishlistItemDto {
  @IsString()
  @IsNotEmpty({ message: 'A product is required' })
  productId!: string;
}
