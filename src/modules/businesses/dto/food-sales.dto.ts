import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { PaymentStatus } from '../types/payment.enum';
import { OrderStatus } from '../entities/business-order.entity';

export class CreateCustomerDto {
  @IsString({ message: 'nameCustomer debe ser un texto' })
  @IsNotEmpty({ message: 'nameCustomer es obligatorio' })
  @MaxLength(120, { message: 'nameCustomer no puede superar 120 caracteres' })
  nameCustomer!: string;

  @IsString({ message: 'locationCustomer debe ser un texto' })
  @IsNotEmpty({ message: 'locationCustomer es obligatoria' })
  @MaxLength(255, {
    message: 'locationCustomer no puede superar 255 caracteres',
  })
  locationCustomer!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30, { message: 'phoneCustomer no puede superar 30 caracteres' })
  phoneCustomer?: string;
}

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {}

export class CreateProductDto {
  @IsString({ message: 'nameProduct debe ser un texto' })
  @IsNotEmpty({ message: 'nameProduct es obligatorio' })
  @MaxLength(120, { message: 'nameProduct no puede superar 120 caracteres' })
  nameProduct!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive({ message: 'basePrice debe ser mayor a cero' })
  basePrice!: number;
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}

export class CreateOrderItemDto {
  @IsUUID('4', { message: 'idProduct debe ser un UUID valido' })
  idProduct!: string;

  @IsInt({ message: 'quantity debe ser un entero' })
  @Min(1, { message: 'quantity debe ser mayor o igual a 1' })
  quantity!: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive({ message: 'unitPrice debe ser mayor a cero' })
  unitPrice?: number;
}

export class CreateOrderDto {
  @IsUUID('4', { message: 'idBusiness debe ser un UUID valido' })
  idBusiness!: string;

  @IsUUID('4', { message: 'idCustomer debe ser un UUID valido' })
  idCustomer!: string;

  @Type(() => Date)
  @IsDate({ message: 'deliveryTime debe ser una fecha valida' })
  deliveryTime!: Date;

  @IsArray({ message: 'items debe ser un arreglo' })
  @ArrayMinSize(1, { message: 'items debe contener al menos un producto' })
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];
}

export class OrderQueryDto {
  @IsUUID('4', { message: 'idBusiness debe ser un UUID valido' })
  idBusiness!: string;

  @IsOptional()
  @IsEnum(OrderStatus, {
    message: `status debe ser uno de: ${Object.values(OrderStatus).join(', ')}`,
  })
  status?: OrderStatus;

  @IsOptional()
  @IsEnum(PaymentStatus, {
    message: `paymentStatus debe ser uno de: ${Object.values(PaymentStatus).join(', ')}`,
  })
  paymentStatus?: PaymentStatus;
}
