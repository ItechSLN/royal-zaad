import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class CreateAddressDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsString()
  @IsNotEmpty({ message: 'Recipient name is required' })
  recipientName!: string;

  @IsString()
  @IsNotEmpty({ message: 'Address line 1 is required' })
  line1!: string;

  @IsOptional()
  @IsString()
  line2?: string;

  @IsString()
  @IsNotEmpty({ message: 'City is required' })
  city!: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsString()
  @IsNotEmpty({ message: 'Postal code is required' })
  postalCode!: string;

  @IsString()
  @Length(2, 2, { message: 'Country must be a 2-letter code (e.g. US)' })
  country!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value === 'true' : value))
  @IsBoolean()
  isDefault?: boolean;
}
