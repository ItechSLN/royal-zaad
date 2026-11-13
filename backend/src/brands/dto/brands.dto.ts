import { PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateBrandsDto {
  @IsString()
  @IsNotEmpty({ message: 'Brand name is required' })
  name!: string;

  @IsString()
  @IsNotEmpty({ message: 'Brand slug is required' })
  slug!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateBrandsDto extends PartialType(CreateBrandsDto) {}
