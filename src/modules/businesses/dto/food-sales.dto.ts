import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDate,
  IsDateString,
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
import { PaymentStatus, PaymentMethod } from '../types/payment.enum';
import { DeliveryStatus } from '../types/delivery-status.enum';
import { OrderStatus, OrderType } from '../entities/business-order.entity';

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

  @IsOptional()
  @IsString()
  @MaxLength(150, { message: 'emailCustomer no puede superar 150 caracteres' })
  emailCustomer?: string;

  @IsOptional()
  @IsString()
  descriptionCustomer?: string;
}

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {}

export class CreateProductPriceDto {
  @IsUUID('4', { message: 'idProduct debe ser un UUID valido' })
  idProduct!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive({ message: 'customPrice debe ser mayor a cero' })
  customPrice!: number;
}

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

export class UpdateRecurringFixedItemDto {
  @IsUUID('4', { message: 'productId debe ser un UUID valido' })
  productId!: string;

  @IsInt({ message: 'quantity debe ser un entero' })
  @Min(1, { message: 'quantity debe ser mayor o igual a 1' })
  quantity!: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive({ message: 'customPrice debe ser mayor a cero' })
  customPrice?: number;
}

export class UpdateRecurringDto {
  @IsOptional()
  @IsArray({ message: 'recurringDays debe ser un arreglo' })
  @ArrayMinSize(1, { message: 'recurringDays debe contener al menos un dia' })
  recurringDays?: string[];

  @IsOptional()
  @IsString({ message: 'deliveryTime debe ser un texto (HH:mm)' })
  deliveryTime?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsArray({ message: 'fixedItems debe ser un arreglo' })
  @ArrayMinSize(1, { message: 'fixedItems debe contener al menos un producto' })
  @ValidateNested({ each: true })
  @Type(() => UpdateRecurringFixedItemDto)
  fixedItems?: UpdateRecurringFixedItemDto[];
}

export class CreateSaleOrderDto {
  @IsOptional()
  @IsEnum(OrderType)
  orderType?: OrderType.SALE;

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

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => RecurringConfigDto)
  recurringConfig?: RecurringConfigDto;
}

export class CreateExpenseOrderDto {
  @IsEnum(OrderType)
  orderType!: OrderType.EXPENSE;

  @IsUUID('4', { message: 'idBusiness debe ser un UUID valido' })
  idBusiness!: string;

  @Type(() => Date)
  @IsDate({ message: 'deliveryTime debe ser una fecha valida' })
  deliveryTime!: Date;

  @IsString({ message: 'description debe ser un texto' })
  @IsNotEmpty({ message: 'description es obligatorio para gastos' })
  description!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive({ message: 'totalAmount debe ser mayor a cero' })
  totalAmount!: number;

  @IsEnum(PaymentMethod, {
    message: `paymentMethod debe ser uno de: ${Object.values(PaymentMethod).join(', ')}`,
  })
  paymentMethod!: PaymentMethod;
}

export class CreateOrderDto {
  @IsOptional()
  @IsEnum(OrderType)
  orderType?: OrderType;
}

export class UpdateOrderDto {
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'deliveryTime debe ser una fecha valida' })
  deliveryTime?: Date;

  @IsOptional()
  @IsArray({ message: 'items debe ser un arreglo' })
  @ArrayMinSize(1, { message: 'items debe contener al menos un producto' })
  @ValidateNested({ each: true })
  @Type(() => UpdateOrderItemDto)
  items?: UpdateOrderItemDto[];
}

export class UpdateOrderItemDto {
  @IsUUID('4', { message: 'idProduct debe ser un UUID valido' })
  idProduct!: string;

  @IsInt({ message: 'quantity debe ser un entero' })
  @Min(0, { message: 'quantity debe ser mayor o igual a 0 (0 para eliminar)' })
  quantity!: number;
}

export class OrderQueryDto {
  @IsUUID('4', { message: 'idBusiness debe ser un UUID valido' })
  idBusiness!: string;

  @IsOptional()
  @IsDateString({}, { message: 'date debe ser un texto YYYY-MM-DD' })
  date?: string;

  @IsOptional()
  @IsEnum(OrderStatus, {
    message: `status debe ser uno de: ${Object.values(OrderStatus).join(', ')}`,
  })
  status?: OrderStatus;

  @IsOptional()
  @IsEnum(OrderType, {
    message: `orderType debe ser uno de: ${Object.values(OrderType).join(', ')}`,
  })
  orderType?: OrderType;

  @IsOptional()
  @IsEnum(PaymentStatus, {
    message: `paymentStatus debe ser uno de: ${Object.values(PaymentStatus).join(', ')}`,
  })
  paymentStatus?: PaymentStatus;

  @IsOptional()
  @IsEnum(DeliveryStatus, {
    message: `deliveryStatus debe ser uno de: ${Object.values(DeliveryStatus).join(', ')}`,
  })
  deliveryStatus?: DeliveryStatus;
}

export class DailySummaryQueryDto {
  @IsOptional()
  @IsDateString({}, { message: 'date debe ser un texto YYYY-MM-DD' })
  date?: string;
}
