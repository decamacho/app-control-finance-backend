import { PartialType } from '@nestjs/mapped-types';
import {
  IsEnum,
  IsHexColor,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { WalletType } from '../types/wallet-type.enum';
import { SUPPORTED_CURRENCIES } from '../services/currency.service';

export class CreateWalletDto {
  @IsString({ message: 'nameWallet debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'nameWallet es obligatorio' })
  @MaxLength(100, { message: 'nameWallet no puede exceder 100 caracteres' })
  nameWallet!: string;

  @IsEnum(WalletType, {
    message: `typeWallet debe ser uno de: ${Object.values(WalletType).join(', ')}`,
  })
  typeWallet!: WalletType;

  @IsOptional()
  @IsEnum(SUPPORTED_CURRENCIES, {
    message: `currencyWallet debe ser uno de: ${SUPPORTED_CURRENCIES.join(', ')}`,
  })
  currencyWallet?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255, {
    message: 'descriptionWallet no puede exceder 255 caracteres',
  })
  descriptionWallet?: string;

  @IsOptional()
  @IsHexColor({
    message: 'colorWallet debe ser un color hexadecimal (#RRGGBB)',
  })
  colorWallet?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'iconWallet no puede exceder 50 caracteres' })
  iconWallet?: string;
}

export class UpdateWalletDto extends PartialType(CreateWalletDto) {}
