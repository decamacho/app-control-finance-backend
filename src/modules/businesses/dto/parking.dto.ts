import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNotEmptyObject,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { VehicleType } from '../entities/vehicle.entity';
import { ShiftType } from '../entities/parking-rate.entity';
import { TicketStatus } from '../entities/parking-ticket.entity';
import { PaymentMethod } from '../types/payment.enum';

export class RegisterEntryDto {
  @IsUUID('4', { message: 'Negocio no encontrado' })
  idBusiness!: string;

  @IsString({ message: 'licensePlate debe ser un texto' })
  @IsNotEmpty({ message: 'licensePlate es obligatoria' })
  @Matches(/^[A-Za-z0-9\s-]+$/, {
    message:
      'licensePlate solo puede contener letras, numeros, espacios y guiones',
  })
  @MaxLength(12, { message: 'licensePlate no puede superar 12 caracteres' })
  licensePlate!: string;
}

export class ExitTicketDto {
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'exitTime debe ser una fecha valida' })
  exitTime?: Date;
}

export class RatePricesDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive({ message: 'DAY debe ser mayor a cero' })
  DAY!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive({ message: 'NIGHT debe ser mayor a cero' })
  NIGHT!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive({ message: 'HOUR debe ser mayor a cero' })
  HOUR!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive({ message: 'MONTHLY debe ser mayor a cero' })
  MONTHLY!: number;
}

export class UpsertRatesDto {
  @IsObject({ message: 'rates debe ser un objeto' })
  @IsNotEmptyObject({ nullable: false })
  @ValidateNested()
  @Type(() => RatePricesDto)
  rates!: Record<VehicleType, RatePricesDto>;
}

export class UpdateRateDto {
  @IsOptional()
  @IsEnum(VehicleType, {
    message: `vehicleType debe ser uno de: ${Object.values(VehicleType).join(', ')}`,
  })
  vehicleType?: VehicleType;

  @IsOptional()
  @IsEnum(ShiftType, {
    message: `shiftType debe ser uno de: ${Object.values(ShiftType).join(', ')}`,
  })
  shiftType?: ShiftType;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive({ message: 'price debe ser mayor a cero' })
  price?: number;
}

export class CreateVehicleDto {
  @IsString({ message: 'licensePlate debe ser un texto' })
  @IsNotEmpty({ message: 'licensePlate es obligatoria' })
  @Matches(/^[A-Za-z0-9\s-]+$/, {
    message:
      'licensePlate solo puede contener letras, numeros, espacios y guiones',
  })
  @MaxLength(12, { message: 'licensePlate no puede superar 12 caracteres' })
  licensePlate!: string;

  @IsEnum(VehicleType, {
    message: `vehicleType debe ser uno de: ${Object.values(VehicleType).join(', ')}`,
  })
  vehicleType!: VehicleType;

  @IsString({ message: 'ownerName debe ser un texto' })
  @IsNotEmpty({ message: 'ownerName es obligatorio' })
  @MaxLength(120, { message: 'ownerName no puede superar 120 caracteres' })
  ownerName!: string;

  @IsString({ message: 'phoneOwner debe ser un texto' })
  @IsNotEmpty({ message: 'phoneOwner es obligatorio' })
  @MaxLength(30, { message: 'phoneOwner no puede superar 30 caracteres' })
  phoneOwner!: string;

  @IsOptional()
  @IsEmail({}, { message: 'emailOwner debe ser un correo valido' })
  @MaxLength(150, { message: 'emailOwner no puede superar 150 caracteres' })
  emailOwner?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'color no puede superar 50 caracteres' })
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80, { message: 'brand no puede superar 80 caracteres' })
  brand?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'model no puede superar 20 caracteres' })
  model?: string;
}

export class UpdateVehicleDto extends PartialType(CreateVehicleDto) {}

export class VehicleQueryDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(12)
  licensePlate?: string;
}

export class MonthlyActivationDto {
  @IsOptional()
  @IsEnum(PaymentMethod, {
    message: `paymentMethod debe ser uno de: ${Object.values(PaymentMethod).join(', ')}`,
  })
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'startDate debe ser una fecha valida' })
  startDate?: Date;
}

export class TicketQueryDto {
  @IsUUID('4', { message: 'Negocio no encontrado' })
  idBusiness!: string;

  @IsOptional()
  @IsEnum(TicketStatus, {
    message: `status debe ser uno de: ${Object.values(TicketStatus).join(', ')}`,
  })
  status?: TicketStatus;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(12)
  licensePlate?: string;
}
