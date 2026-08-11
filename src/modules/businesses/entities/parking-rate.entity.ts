import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Business } from './business.entity';
import { VehicleType } from './vehicle.entity';

export enum ShiftType {
  DAY = 'DAY',
  NIGHT = 'NIGHT',
  HOUR = 'HOUR',
}

@Entity('parking_rates')
@Index(['idBusiness', 'vehicleType', 'shiftType'], { unique: true })
export class ParkingRate {
  @PrimaryGeneratedColumn('uuid')
  idRate!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price!: number;

  @Column({ type: 'enum', enum: VehicleType })
  vehicleType!: VehicleType;

  @Column({ type: 'enum', enum: ShiftType })
  shiftType!: ShiftType;

  @ManyToOne(() => Business, (business) => business.parkingRates, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'idBusiness' })
  business!: Business;
}
