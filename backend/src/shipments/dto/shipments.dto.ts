import { PartialType } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/pagination-query.data';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { ShipmentStatus } from '@prisma/client';

export class CreateShipmentsDto {
  @IsString()
  @IsNotEmpty({ message: 'Shipment awb is required' })
  awb!: string;

  @IsString()
  @IsNotEmpty({ message: 'Shipment order id is required' })
  orderId!: string;

  @IsString()
  @IsNotEmpty({ message: 'Shipment carrier is required' })
  carrier!: string;

  @IsOptional()
  @IsString()
  service?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsEnum(ShipmentStatus)
  status?: ShipmentStatus;

  @IsOptional()
  @IsDateString()
  eta?: string;

  @IsOptional()
  @IsDateString()
  dispatchedAt?: string;

  @IsOptional()
  @IsDateString()
  deliveredAt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  attempts?: number;

  @IsOptional()
  @IsString()
  instructions?: string;
}

export class UpdateShipmentsDto extends PartialType(CreateShipmentsDto) {}

/** Query filters backing the list screen's tabs and filter bar. */
export class ShipmentsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(ShipmentStatus)
  status?: ShipmentStatus;

  @IsOptional()
  @IsString()
  carrier?: string;

  @IsOptional()
  @IsString()
  orderId?: string;
}
