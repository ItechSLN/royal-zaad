import { PartialType } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/pagination-query.data';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAuditLogDto {
  @IsString()
  @IsNotEmpty({ message: 'Audit event actor is required' })
  actor!: string;

  @IsString()
  @IsNotEmpty({ message: 'Audit event action is required' })
  action!: string;

  @IsString()
  @IsNotEmpty({ message: 'Audit event entity is required' })
  entity!: string;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsString()
  meta?: string;

  @IsOptional()
  @IsString()
  ip?: string;
}

export class UpdateAuditLogDto extends PartialType(CreateAuditLogDto) {}

/** Query filters backing the list screen's tabs and filter bar. */
export class AuditLogQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  entity?: string;

  @IsOptional()
  @IsString()
  actor?: string;

  @IsOptional()
  @IsString()
  action?: string;
}
