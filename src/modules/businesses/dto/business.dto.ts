import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { BusinessType } from '../entities/business.entity';

export class CreateBusinessDto {
  @IsString({ message: 'nameBusiness debe ser un texto' })
  @IsNotEmpty({ message: 'nameBusiness es obligatorio' })
  @MaxLength(150, { message: 'nameBusiness no puede superar 150 caracteres' })
  nameBusiness!: string;

  @IsEnum(BusinessType, {
    message: `businessType debe ser uno de: ${Object.values(BusinessType).join(', ')}`,
  })
  businessType!: BusinessType;
}

export class UpdateBusinessDto extends PartialType(CreateBusinessDto) {}
