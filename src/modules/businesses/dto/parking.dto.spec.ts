import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { MonthlyActivationDto, UpsertRatesDto } from './parking.dto';

describe('parking DTOs', () => {
  describe('UpsertRatesDto', () => {
    const valid = () => ({
      MOTO: { DAY: 5000, NIGHT: 5000, HOUR: 1000, MONTHLY: 70000 },
      CARRO: { DAY: 6000, NIGHT: 6000, HOUR: 2000, MONTHLY: 90000 },
      CAMIONETA: { DAY: 8000, NIGHT: 9000, HOUR: 3000, MONTHLY: 110000 },
    });

    it('acepta un body plano con los tres tipos y sus cuatro tarifas', async () => {
      const dto = plainToInstance(UpsertRatesDto, valid());

      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('rechaza tarifas no numericas o en cero', async () => {
      const dto = plainToInstance(UpsertRatesDto, {
        ...valid(),
        MOTO: { DAY: '5000', NIGHT: 0, HOUR: 1000, MONTHLY: 70000 },
      });

      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.property === 'MOTO')).toBe(true);
    });

    it('rechaza si falta un tipo de vehiculo', async () => {
      const dto = plainToInstance(UpsertRatesDto, {
        MOTO: valid().MOTO,
        CARRO: valid().CARRO,
      });

      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('MonthlyActivationDto', () => {
    it('acepta payments con montos y metodos mixtos', async () => {
      const dto = plainToInstance(MonthlyActivationDto, {
        payments: [
          { amount: 60000, paymentMethod: 'NEQUI' },
          { amount: 30000, paymentMethod: 'CASH' },
        ],
      });

      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('acepta un body vacio (pago en 0)', async () => {
      const errors = await validate(plainToInstance(MonthlyActivationDto, {}));

      expect(errors).toHaveLength(0);
    });

    it('rechaza metodos de pago invalidos', async () => {
      const dto = plainToInstance(MonthlyActivationDto, {
        payments: [{ amount: 1000, paymentMethod: 'EFECTIVO' }],
      });

      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
