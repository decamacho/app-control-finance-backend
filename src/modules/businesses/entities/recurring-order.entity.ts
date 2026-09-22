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

@Entity('recurring_orders')
export class RecurringOrder {
  @PrimaryGeneratedColumn('uuid')
  idRecurringOrder!: string;

  @Column({ type: 'jsonb' })
  recurringDays!: string[];

  @Column({ type: 'time' })
  deliveryTime!: string;

  @Column({ type: 'date', nullable: true })
  startDate!: Date | null;

  @Column({ type: 'date', nullable: true })
  endDate!: Date | null;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'jsonb' })
  fixedItems!: Array<{
    productId: string;
    quantity: number;
    customPrice?: number;
  }>;

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
