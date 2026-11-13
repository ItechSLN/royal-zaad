import { PartialType } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ContactStatus, ContactTopic } from '@prisma/client';
import { PaginationQueryDto } from '../../common/pagination-query.data';

/** Public payload — anything an anonymous visitor is allowed to set. */
export class CreateContactDto {
  @MaxLength(120)
  @IsString()
  @IsNotEmpty({ message: 'Your name is required' })
  name!: string;

  @IsEmail({}, { message: 'Enter a valid email address' })
  @IsNotEmpty({ message: 'Your email is required' })
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsEnum(ContactTopic, { message: 'Choose a topic from the list' })
  topic?: ContactTopic;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  orderNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  subject?: string;

  @MaxLength(4000)
  @MinLength(10, { message: 'Please add a little more detail' })
  @IsString()
  @IsNotEmpty({ message: 'Please tell us how we can help' })
  message!: string;
}

/** Admin-only fields; kept out of the public create payload. */
export class UpdateContactDto extends PartialType(CreateContactDto) {
  @IsOptional()
  @IsEnum(ContactStatus)
  status?: ContactStatus;

  @IsOptional()
  @IsString()
  handledById?: string;

  @IsOptional()
  @IsString()
  internalNote?: string;
}

export class ContactQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(ContactStatus, { message: 'Unknown status' })
  status?: ContactStatus;

  @IsOptional()
  @IsEnum(ContactTopic, { message: 'Unknown topic' })
  topic?: ContactTopic;

  @IsOptional()
  @IsString()
  search?: string;
}
