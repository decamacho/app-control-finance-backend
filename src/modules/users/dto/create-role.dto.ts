import {
  IsNotEmpty,
  IsString,
  Length,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class CreateRoleDto {
  @IsNotEmpty({ message: 'El nombre del rol es obligatorio' })
  @IsString({ message: 'El nombre del rol debe ser una cadena de texto' })
  @Length(3, 50, {
    message: 'El nombre del rol debe tener entre 3 y 50 caracteres',
  })
  nameRole!: string;

  @IsOptional()
  @IsBoolean({ message: 'El estado del rol debe ser un valor booleano.' })
  stateRole?: boolean;
}
