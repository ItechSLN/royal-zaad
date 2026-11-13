import { PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, IsNotEmpty} from 'class-validator';

export class CreateRolesDto {
  @IsString()
  @IsNotEmpty({message: 'Role name is required'})
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
};

export class UpdateRolesDto extends PartialType(CreateRolesDto) {}