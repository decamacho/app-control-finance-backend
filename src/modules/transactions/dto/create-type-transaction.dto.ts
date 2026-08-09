import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { ValidTransactionTypes } from '../types/transactios-type.enum';

export class CreateTypeTransactionDto {
  @IsNotEmpty({ message: 'El nombre del tipo de transacción es obligatorio' })
  @IsString({
    message: 'El nombre del tipo de transaccion debe ser una cadena de texto',
  })
  @IsEnum(ValidTransactionTypes, {
    message: `El tipo de transaccion debe ser uno valido: ${Object.values(ValidTransactionTypes).join(', ')}`,
  })
  typeTransaction!: ValidTransactionTypes;

  @IsOptional()
  @IsBoolean({
    message: 'El estado del tipo de transacción debe ser un valor booleano.',
  })
  stateTypeTransaction!: boolean;
}
