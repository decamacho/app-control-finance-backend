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
import { BusinessCustomer } from './business-customer.entity';
import { BusinessOrder } from './business-order.entity';

export enum RecurringFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  BIWEEKLY = 'BIWEEKLY',
  MONTHLY = 'MONTHLY',
}

@Entity('recurring_orders')
export class RecurringOrder {
  @PrimaryGeneratedColumn('uuid')
  idRecurringOrder!: string;

  @Column({ type: 'enum', enum: RecurringFrequency })
  frequency!: RecurringFrequency;

  @Column({ type: 'timestamp' })
  nextDeliveryDate!: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalAmount!: number;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  modifyAt!: Date;

  @ManyToOne(() => BusinessCustomer, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'idCustomer' })
  customer!: BusinessCustomer;

  @OneToMany(() => BusinessOrder, (order) => order.recurringOrder)
  orders!: BusinessOrder[];
}
