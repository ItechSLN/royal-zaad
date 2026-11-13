import { PartialType } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/pagination-query.data';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { AlertSeverity } from '@prisma/client';

export class CreateNotificationsDto {
  @IsString()
  @IsNotEmpty({ message: 'Notification title is required' })
  title!: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsEnum(AlertSeverity)
  severity?: AlertSeverity;

  @IsOptional()
  @IsString()
  meta?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  unread?: boolean;

  @IsOptional()
  @IsString()
  ruleId?: string;
}

export class UpdateNotificationsDto extends PartialType(
  CreateNotificationsDto,
) {}

export class CreateAlertRuleDto {
  @IsString()
  @IsNotEmpty({ message: 'Rule name is required' })
  name!: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(AlertSeverity)
  severity?: AlertSeverity;

  @IsOptional()
  @IsString()
  channels?: string;

  @IsOptional()
  @IsString()
  threshold?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isMuted?: boolean;
}

export class UpdateAlertRuleDto extends PartialType(CreateAlertRuleDto) {}

/** `filter` accepts `unread` or `critical`; omitted returns everything. */
export class NotificationsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  filter?: string;
}
