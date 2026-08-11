import { Injectable } from '@nestjs/common';
import { ShiftType } from '../entities/parking-rate.entity';

export interface ParkingPricingConfig {
  dayStartHour: number;
  dayStartMinute: number;
  dayEndHour: number;
  dayEndMinute: number;
  graceMinutes: number;
}

const DEFAULT_CONFIG: ParkingPricingConfig = {
  dayStartHour: 6,
  dayStartMinute: 0,
  dayEndHour: 18,
  dayEndMinute: 0,
  graceMinutes: 15,
};

export type RateMap = Record<ShiftType, number>;

interface Tramo {
  shiftType: ShiftType;
  minutes: number;
  isComplete: boolean;
}

interface ShiftBounds {
  start: Date;
  end: Date;
  shiftType: ShiftType;
}

@Injectable()
export class PricingService {
  constructor(private readonly config: ParkingPricingConfig = DEFAULT_CONFIG) {}

  calculateTotal(entry: Date, exit: Date, rates: RateMap): number {
    if (exit.getTime() <= entry.getTime()) {
      return 0;
    }

    const tramos = this.descomponerEnFranjas(entry, exit);
    let total = 0;

    for (let i = 0; i < tramos.length; i++) {
      const tramo = tramos[i];

      if (tramo.isComplete) {
        total += Number(rates[tramo.shiftType]);
      } else {
        const horas = Math.max(1, Math.ceil(tramo.minutes / 60));
        total += horas * Number(rates[ShiftType.HOUR]);

        if (
          i === 0 &&
          tramos.length === 1 &&
          tramo.minutes <= this.config.graceMinutes
        ) {
          total = 0;
        }
      }
    }

    return Math.round(total * 100) / 100;
  }

  private descomponerEnFranjas(entry: Date, exit: Date): Tramo[] {
    const tramos: Tramo[] = [];
    let cursor = new Date(entry);

    while (cursor.getTime() < exit.getTime()) {
      const bounds = this.getShiftBounds(cursor);
      const tramoEnd =
        bounds.end.getTime() < exit.getTime() ? bounds.end : exit;

      if (tramoEnd.getTime() <= cursor.getTime()) {
        cursor = exit;
        break;
      }

      const minutes = (tramoEnd.getTime() - cursor.getTime()) / 60000;
      tramos.push({
        shiftType: bounds.shiftType,
        minutes,
        isComplete: tramoEnd.getTime() === bounds.end.getTime(),
      });

      cursor = tramoEnd;
    }

    return tramos;
  }

  private getShiftBounds(date: Date): ShiftBounds {
    const currentMinutes = date.getHours() * 60 + date.getMinutes();
    const dayStartMinutes =
      this.config.dayStartHour * 60 + this.config.dayStartMinute;
    const dayEndMinutes =
      this.config.dayEndHour * 60 + this.config.dayEndMinute;

    if (currentMinutes >= dayStartMinutes && currentMinutes < dayEndMinutes) {
      const start = new Date(date);
      start.setHours(
        this.config.dayStartHour,
        this.config.dayStartMinute,
        0,
        0,
      );
      const end = new Date(date);
      end.setHours(this.config.dayEndHour, this.config.dayEndMinute, 0, 0);

      return { start, end, shiftType: ShiftType.DAY };
    }

    let start: Date;
    let end: Date;

    if (currentMinutes >= dayEndMinutes) {
      start = new Date(date);
      start.setHours(this.config.dayEndHour, this.config.dayEndMinute, 0, 0);
      end = new Date(date);
      end.setDate(end.getDate() + 1);
      end.setHours(this.config.dayStartHour, this.config.dayStartMinute, 0, 0);
    } else {
      start = new Date(date);
      start.setDate(start.getDate() - 1);
      start.setHours(this.config.dayEndHour, this.config.dayEndMinute, 0, 0);
      end = new Date(date);
      end.setHours(this.config.dayStartHour, this.config.dayStartMinute, 0, 0);
    }

    return { start, end, shiftType: ShiftType.NIGHT };
  }
}
