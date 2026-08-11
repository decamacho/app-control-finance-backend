import { BadRequestException } from '@nestjs/common';
import { CurrencyService } from './currency.service';

describe('CurrencyService', () => {
  let service: CurrencyService;

  beforeEach(() => {
    service = new CurrencyService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateCurrency', () => {
    it('acepta una moneda soportada', () => {
      expect(() => service.validateCurrency('USD')).not.toThrow();
    });

    it('lanza BadRequestException con moneda no soportada', () => {
      expect(() => service.validateCurrency('MXN')).toThrow(
        BadRequestException,
      );
    });
  });

  describe('getDefaultCurrency', () => {
    it('retorna la moneda por defecto del usuario', () => {
      expect(
        service.getDefaultCurrency({ currencyDefault: 'USD' } as never),
      ).toBe('USD');
    });

    it('retorna COP si el usuario no tiene moneda definida', () => {
      expect(service.getDefaultCurrency(null)).toBe('COP');
    });
  });
});
