import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { ValidTransactionTypes } from '../types/transactios-type.enum';
import { SplitMethod } from '../../splits/entities/split.entity';

export class CreateTransactionDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive({ message: 'El monto debe ser mayor a cero' })
  amount!: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  currency?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsUUID('4', { message: 'idWallet debe ser un UUID valido' })
  idWallet!: string;

  @IsUUID('4', { message: 'idTypeTransaction debe ser un UUID valido' })
  idTypeTransaction!: string;

  @IsOptional()
  @IsUUID('4')
  idCategory?: string;

  @IsOptional()
  @IsUUID('4')
  idGoal?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'transactionDate debe ser una fecha valida' })
  transactionDate?: Date;

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @IsOptional()
  @IsString()
  recurrencePattern?: string;
}

export class TransferDto {
  @IsUUID('4', { message: 'idSourceWallet debe ser un UUID valido' })
  idSourceWallet!: string;

  @IsUUID('4', { message: 'idDestinationWallet debe ser un UUID valido' })
  idDestinationWallet!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive({ message: 'El monto debe ser mayor a cero' })
  amount!: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  currency?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  transactionDate?: Date;
}

export class SplitParticipantDto {
  @IsOptional()
  @IsUUID('4')
  idUserDebtor?: string;

  @IsOptional()
  @IsString()
  friendName?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive({ message: 'El monto del participante debe ser mayor a cero' })
  amountSplit?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  percentage?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  shares?: number;
}

export class SplitTransactionDto extends CreateTransactionDto {
  @IsEnum(SplitMethod, {
    message: `splitMethod debe ser uno de: ${Object.values(SplitMethod).join(', ')}`,
  })
  splitMethod!: SplitMethod;

  @IsArray()
  @ArrayMinSize(2, { message: 'Se requieren al menos 2 participantes' })
  @ValidateNested({ each: true })
  @Type(() => SplitParticipantDto)
  participants!: SplitParticipantDto[];
}

export class RefundDto {
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive({ message: 'El monto del reembolso debe ser mayor a cero' })
  amount?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID('4')
  idWallet?: string;
}

export class HistoryQueryDto {
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  fromDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  toDate?: Date;

  @IsOptional()
  @IsEnum(ValidTransactionTypes)
  typeTransaction?: ValidTransactionTypes;

  @IsOptional()
  @IsUUID('4')
  idWallet?: string;

  @IsOptional()
  @IsUUID('4')
  idCategory?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class PendingQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
