import { PricingService, RateMap } from './pricing.service';
import { ShiftType } from '../entities/parking-rate.entity';

describe('PricingService', () => {
  let service: PricingService;

  const rates: RateMap = {
    [ShiftType.DAY]: 6000,
    [ShiftType.NIGHT]: 6000,
    [ShiftType.HOUR]: 1000,
  };

  const dateAt = (hour: number, minute: number, dayOffset = 0): Date =>
    new Date(2026, 0, 1 + dayOffset, hour, minute, 0, 0);

  beforeEach(() => {
    service = new PricingService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('cobra franja DAY entera + horas parciales NIGHT (10:00 -> 20:30 = 9000)', () => {
    const total = service.calculateTotal(dateAt(10, 0), dateAt(20, 30), rates);
    expect(total).toBe(9000);
  });

  it('cobra una franja DAY completa (06:00 -> 18:00 = 6000)', () => {
    const total = service.calculateTotal(dateAt(6, 0), dateAt(18, 0), rates);
    expect(total).toBe(6000);
  });

  it('cobra una franja NIGHT completa (22:00 -> 06:00 = 6000)', () => {
    const total = service.calculateTotal(dateAt(22, 0), dateAt(6, 0, 1), rates);
    expect(total).toBe(6000);
  });

  it('aplica gracia cuando la permanencia no supera 15 min (09:00 -> 09:10 = 0)', () => {
    const total = service.calculateTotal(dateAt(9, 0), dateAt(9, 10), rates);
    expect(total).toBe(0);
  });

  it('cobra por horas un tramo parcial sin cortes de franja (18:05 -> 22:10 = 5000)', () => {
    const total = service.calculateTotal(dateAt(18, 5), dateAt(22, 10), rates);
    expect(total).toBe(5000);
  });

  it('acumula franjas completas y horas en permanencias de varios dias (10:00 -> dia siguiente 08:30 = 15000)', () => {
    const total = service.calculateTotal(
      dateAt(10, 0),
      dateAt(8, 30, 1),
      rates,
    );
    expect(total).toBe(15000);
  });

  it('cobra una hora minima en tramo parcial dentro de franja (09:00 -> 10:00 = 1000)', () => {
    const total = service.calculateTotal(dateAt(9, 0), dateAt(10, 0), rates);
    expect(total).toBe(1000);
  });

  it('retorna 0 si la salida no es posterior a la entrada', () => {
    const total = service.calculateTotal(dateAt(10, 0), dateAt(9, 0), rates);
    expect(total).toBe(0);
  });

  it('redondea con dos decimales', () => {
    const total = service.calculateTotal(dateAt(18, 0), dateAt(18, 30), {
      ...rates,
      [ShiftType.HOUR]: 1000,
    });
    expect(total).toBe(1000);
  });

  it('usa FRANJAS configurables (dia 08:00 - 20:00)', () => {
    const custom = new PricingService({
      dayStartHour: 8,
      dayStartMinute: 0,
      dayEndHour: 20,
      dayEndMinute: 0,
      graceMinutes: 15,
    });

    const total = custom.calculateTotal(dateAt(8, 0), dateAt(20, 0), rates);
    expect(total).toBe(6000);
  });

  it('liquida correctamente con tarifas propias de CAMIONETA (DAY=8000, NIGHT=9000, HOUR=2000)', () => {
    const camionetaRates: RateMap = {
      [ShiftType.DAY]: 8000,
      [ShiftType.NIGHT]: 9000,
      [ShiftType.HOUR]: 2000,
    };

    const unaFranja = service.calculateTotal(
      dateAt(6, 0),
      dateAt(18, 0),
      camionetaRates,
    );
    expect(unaFranja).toBe(8000);

    const conHoras = service.calculateTotal(
      dateAt(10, 0),
      dateAt(20, 30),
      camionetaRates,
    );
    expect(conHoras).toBe(8000 + 3 * 2000);
  });
});
