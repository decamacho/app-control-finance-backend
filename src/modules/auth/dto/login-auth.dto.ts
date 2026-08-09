import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginAuthDto {
  @IsEmail()
  @IsNotEmpty()
  emailUser!: string;

  @IsNotEmpty()
  @IsString()
  passwordUser!: string;
}
