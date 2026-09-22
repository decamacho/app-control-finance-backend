import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateDeliveryItemDto {
  @IsUUID('4', { message: 'idOrderItem debe ser un UUID valido' })
  idOrderItem!: string;

  @IsInt({ message: 'quantity debe ser un entero' })
  @Min(1, { message: 'quantity debe ser mayor o igual a 1' })
  quantity!: number;
}

export class CreateDeliveryDto {
  @IsArray({ message: 'items debe ser un arreglo' })
  @ArrayMinSize(1, { message: 'items debe contener al menos un producto' })
  @ValidateNested({ each: true })
  @Type(() => CreateDeliveryItemDto)
  items!: CreateDeliveryItemDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}

export class RecurringConfigDto {
  @IsArray({ message: 'recurringDays debe ser un arreglo' })
  @ArrayMinSize(1, { message: 'recurringDays debe contener al menos un dia' })
  recurringDays!: string[];

  @IsString({ message: 'deliveryTime debe ser un texto (HH:mm)' })
  deliveryTime!: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}

export class RecurringOrderQueryDto {
  @IsUUID('4', { message: 'idBusiness debe ser un UUID valido' })
  idBusiness!: string;
}
