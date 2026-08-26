import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BusinessCustomer } from './business-customer.entity';
import { BusinessOrderItem } from './business-order-item.entity';
import { Payment } from './payment.entity';
import { PaymentStatus } from '../types/payment.enum';
import { RecurringOrder } from './recurring-order.entity';

export enum OrderStatus {
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
}

@Entity('business_orders')
export class BusinessOrder {
  @PrimaryGeneratedColumn('uuid')
  idOrder!: string;

  @Column({ type: 'timestamp' })
  deliveryTime!: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalAmount!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  paidAmount!: number;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  paymentStatus!: PaymentStatus;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.ACTIVE })
  statusOrder!: OrderStatus;

  @ManyToOne(() => BusinessCustomer, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'idCustomer' })
  customer!: BusinessCustomer;

  @ManyToOne(() => RecurringOrder, (ro) => ro.orders, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'idRecurringOrder' })
  recurringOrder!: RecurringOrder | null;

  @OneToMany(() => BusinessOrderItem, (item) => item.order, { cascade: true })
  items!: BusinessOrderItem[];

  @OneToMany(() => Payment, (payment) => payment.order)
  payments!: Payment[];
}
