import { Injectable, BadRequestException } from '@nestjs/common';
import { User } from '../../users/entities/user.entity';

export const SUPPORTED_CURRENCIES = ['COP', 'USD', 'EUR', 'GBP'] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

@Injectable()
export class CurrencyService {
  validateCurrency(currency: string): void {
    if (!SUPPORTED_CURRENCIES.includes(currency as SupportedCurrency)) {
      throw new BadRequestException(
        `La moneda ${currency} no es soportada. Monedas válidas: ${SUPPORTED_CURRENCIES.join(', ')}`,
      );
    }
  }

  getDefaultCurrency(user: User | null | undefined): string {
    return user?.currencyDefault ?? 'COP';
  }
}
