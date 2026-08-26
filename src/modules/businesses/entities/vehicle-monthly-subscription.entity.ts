import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Vehicle } from './vehicle.entity';
import { VehicleMonthlyHistory } from './vehicle-monthly-history.entity';

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

@Entity('vehicle_monthly_subscriptions')
export class VehicleMonthlySubscription {
  @PrimaryGeneratedColumn('uuid')
  idSubscription!: string;

  @Column({ type: 'int' })
  billingDay!: number;

  @Column({ type: 'timestamp' })
  periodStartDate!: Date;

  @Column({ type: 'timestamp', nullable: true })
  periodEndDate!: Date | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  amountDue!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  amountPaid!: number;

  @Column({ type: 'int', default: 1 })
  totalMonthsSubscribed!: number;

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.ACTIVE,
  })
  status!: SubscriptionStatus;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  modifyAt!: Date;

  @ManyToOne(() => Vehicle, (vehicle) => vehicle.subscriptions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'idVehicle' })
  vehicle!: Vehicle;

  @OneToMany(() => VehicleMonthlyHistory, (history) => history.subscription)
  history!: VehicleMonthlyHistory[];
}
