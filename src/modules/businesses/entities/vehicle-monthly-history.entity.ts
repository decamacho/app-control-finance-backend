import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { VehicleMonthlySubscription } from './vehicle-monthly-subscription.entity';

@Entity('vehicle_monthly_history')
export class VehicleMonthlyHistory {
  @PrimaryGeneratedColumn('uuid')
  idHistory!: string;

  @Column({ type: 'timestamp' })
  periodStart!: Date;

  @Column({ type: 'timestamp' })
  periodEnd!: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: number;

  @Column({ type: 'timestamp', nullable: true })
  paidAt!: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @ManyToOne(
    () => VehicleMonthlySubscription,
    (subscription) => subscription.history,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'idSubscription' })
  subscription!: VehicleMonthlySubscription;
}
