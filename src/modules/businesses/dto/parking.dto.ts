import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { VehicleType } from '../entities/vehicle.entity';
import { ShiftType } from '../entities/parking-rate.entity';
import { TicketStatus } from '../entities/parking-ticket.entity';

export class RegisterEntryDto {
  @IsUUID('4', { message: 'idBusiness debe ser un UUID valido' })
  idBusiness!: string;

  @IsString({ message: 'licensePlate debe ser un texto' })
  @IsNotEmpty({ message: 'licensePlate es obligatoria' })
  @Matches(/^[A-Za-z0-9-]+$/, {
    message: 'licensePlate solo puede contener letras, numeros y guiones',
  })
  @MaxLength(12, { message: 'licensePlate no puede superar 12 caracteres' })
  licensePlate!: string;

  @IsOptional()
  @IsEnum(VehicleType, {
    message: `vehicleType debe ser uno de: ${Object.values(VehicleType).join(', ')}`,
  })
  vehicleType?: VehicleType;

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

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'photoUrl no puede superar 500 caracteres' })
  photoUrl?: string;
}

export class ExitTicketDto {
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'exitTime debe ser una fecha valida' })
  exitTime?: Date;
}

export class CreateRateDto {
  @IsEnum(VehicleType, {
    message: `vehicleType debe ser uno de: ${Object.values(VehicleType).join(', ')}`,
  })
  vehicleType!: VehicleType;

  @IsEnum(ShiftType, {
    message: `shiftType debe ser uno de: ${Object.values(ShiftType).join(', ')}`,
  })
  shiftType!: ShiftType;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive({ message: 'price debe ser mayor a cero' })
  price!: number;
}

export class UpdateRateDto extends PartialType(CreateRateDto) {}

export class TicketQueryDto {
  @IsUUID('4', { message: 'idBusiness debe ser un UUID valido' })
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
