import { BadRequestException } from '@nestjs/common';
import { VehicleType } from '../entities/vehicle.entity';

export const PLATE_PATTERNS: Record<VehicleType, RegExp> = {
  [VehicleType.CARRO]: /^[A-Z]{3}[0-9]{3}$/,
  [VehicleType.CAMIONETA]: /^[A-Z]{3}[0-9]{3}$/,
  [VehicleType.MOTO]: /^[A-Z]{3}[0-9]{2}[A-Z]$/,
};

export function normalizePlate(licensePlate: string): string {
  return licensePlate
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '');
}

export function validatePlateFormat(
  licensePlate: string,
  vehicleType: VehicleType,
): void {
  const pattern = PLATE_PATTERNS[vehicleType];
  if (!pattern.test(licensePlate)) {
    const expected =
      vehicleType === VehicleType.MOTO
        ? '3 letras, 2 numeros y 1 letra (ej: ABC19H)'
        : '3 letras y 3 numeros (ej: ABC123)';
    throw new BadRequestException(
      `La placa ${licensePlate} no es valida para ${vehicleType}; debe tener ${expected}`,
    );
  }
}
