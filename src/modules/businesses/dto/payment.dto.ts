import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsPositive,
  ValidateNested,
} from 'class-validator';
import { PaymentMethod } from '../types/payment.enum';

export class RegisterPaymentItemDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive({ message: 'amount debe ser mayor a cero' })
  amount!: number;

  @IsEnum(PaymentMethod, {
    message: `paymentMethod debe ser uno de: ${Object.values(PaymentMethod).join(', ')}`,
  })
  paymentMethod!: PaymentMethod;
}

export class RegisterPaymentsDto {
  @IsArray({ message: 'payments debe ser un arreglo' })
  @ArrayMinSize(1, { message: 'payments debe contener al menos un pago' })
  @ValidateNested({ each: true })
  @Type(() => RegisterPaymentItemDto)
  payments!: RegisterPaymentItemDto[];
}
