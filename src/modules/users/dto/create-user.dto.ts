import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  @Length(2, 100)
  nameUser!: string;

  @IsNotEmpty()
  @IsString()
  @Length(2, 100)
  firstNameUser!: string;

  @IsNotEmpty()
  @IsString()
  @Length(2, 100)
  lastNameUser!: string;

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

  @IsOptional()
  @IsString()
  @Length(5, 20)
  phoneNumberUser?: string;

  @IsOptional()
  @IsString()
  @Length(2, 50)
  countryUser?: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currencyDefault?: string;

  @IsNotEmpty()
  @IsUUID('4')
  idRole!: string;
}
