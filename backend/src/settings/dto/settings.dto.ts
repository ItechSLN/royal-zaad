import { PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateSettingsDto {
  @IsString()
  @IsNotEmpty({ message: 'Key is required' })
  key!: string;

  @IsString()
  @IsNotEmpty({ message: 'Value is required' })
  value!: string;
}

export class UpdateSettingsDto extends PartialType(CreateSettingsDto) {}
