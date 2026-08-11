import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Business } from './business.entity';
import { BusinessCustomer } from './business-customer.entity';
import { BusinessOrderItem } from './business-order-item.entity';
import { Payment } from './payment.entity';
import { PaymentStatus } from '../types/payment.enum';
import { Transaction } from '../../transactions/entities/transaction.entity';

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

  @ManyToOne(() => Business, (business) => business.orders, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'idBusiness' })
  business!: Business;

  @ManyToOne(() => BusinessCustomer, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'idCustomer' })
  customer!: BusinessCustomer;

  @OneToMany(() => BusinessOrderItem, (item) => item.order, { cascade: true })
  items!: BusinessOrderItem[];

  @OneToMany(() => Payment, (payment) => payment.order)
  payments!: Payment[];

  // Relación financiera futura: NO se escribe en v1.
  @ManyToOne(() => Transaction, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'idTransaction' })
  transaction!: Transaction | null;
}
