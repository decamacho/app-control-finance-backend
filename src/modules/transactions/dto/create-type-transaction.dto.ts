import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class CreateTypeTransactionDto {
  @IsNotEmpty({ message: 'El nombre del tipo de transacción es obligatorio' })
  @IsString({
    message: 'El nombre del tipo de transaccion debe ser una cadena de texto',
  })
  @Length(3, 150, {
    message:
      'El nombre del tipo de transaccion debe tener entre 3 y 50 caracteres',
  })
  typeTransaction!: string;

  @IsOptional()
  @IsBoolean({
    message: 'El estado del tipo de transacción debe ser un valor booleano.',
  })
  stateTypeTransaction!: boolean;
}
