import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class RegisterAuthDto {
  @IsNotEmpty()
  @IsString()
  @Length(2, 100)
  nameUser!: string;

  @IsNotEmpty()
  @IsEmail({}, { message: 'The email must be a valid email address' })
  @Transform((params: { value: unknown }) =>
    typeof params.value === 'string'
      ? params.value.trim().toLowerCase()
      : params.value,
  )
  emailUser!: string;

  @IsNotEmpty()
  @IsString()
  @Length(8, 64)
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-f]).*$/, {
    message:
      'La contraseña es demasiado debil. Debe incluir al menos 1 mayuscula, 1 minuscula y 1 numero o caracter especial.',
  })
  passwordUser!: string;
}
