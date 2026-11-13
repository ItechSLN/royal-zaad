import { PartialType } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/pagination-query.data';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { TransferStatus, WarehouseStatus } from '@prisma/client';

export class CreateWarehousesDto {
  @IsString()
  @IsNotEmpty({ message: 'Warehouse code is required' })
  code!: string;

  @IsString()
  @IsNotEmpty({ message: 'Warehouse name is required' })
  name!: string;

  @IsString()
  @IsNotEmpty({ message: 'Warehouse city is required' })
  city!: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  manager?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0, { message: 'Capacity cannot be negative' })
  capacity?: number;

  @IsOptional()
  @IsEnum(WarehouseStatus)
  status?: WarehouseStatus;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateWarehousesDto extends PartialType(CreateWarehousesDto) {}

export class CreateStockTransferDto {
  @IsOptional()
  @IsString()
  reference?: string;

  @IsString()
  @IsNotEmpty({ message: 'Source warehouse is required' })
  fromId!: string;

  @IsString()
  @IsNotEmpty({ message: 'Destination warehouse is required' })
  toId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'A transfer must move at least 1 unit' })
  @IsNotEmpty({ message: 'Units are required' })
  units!: number;

  @IsOptional()
  @IsEnum(TransferStatus)
  status?: TransferStatus;

  @IsOptional()
  @IsDateString()
  expectedAt?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateStockTransferDto extends PartialType(
  CreateStockTransferDto,
) {}

/** Query filters backing the list screen's tabs and filter bar. */
export class WarehousesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(WarehouseStatus)
  status?: WarehouseStatus;

  @IsOptional()
  @IsString()
  city?: string;
}
