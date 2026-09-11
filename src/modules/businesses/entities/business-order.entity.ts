import {
  Column,
  CreateDateColumn,
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
import { DeliveryStatus } from '../types/delivery-status.enum';
import { RecurringOrder } from './recurring-order.entity';
import { OrderDelivery } from './order-delivery.entity';

export enum OrderStatus {
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
}

export enum OrderType {
  SALE = 'SALE',
  EXPENSE = 'EXPENSE',
}

@Entity('business_orders')
export class BusinessOrder {
  @PrimaryGeneratedColumn('uuid')
  idOrder!: string;

  @Column({ type: 'enum', enum: OrderType, default: OrderType.SALE })
  orderType!: OrderType;

  @Column({ type: 'timestamp' })
  deliveryTime!: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalAmount!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  paidAmount!: number;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  paymentStatus!: PaymentStatus;

  @Column({
    type: 'enum',
    enum: DeliveryStatus,
    default: DeliveryStatus.NOT_DELIVERED,
  })
  deliveryStatus!: DeliveryStatus;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.ACTIVE })
  statusOrder!: OrderStatus;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @ManyToOne(() => Business, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'idBusiness' })
  business!: Business | null;

  @ManyToOne(() => BusinessCustomer, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'idCustomer' })
  customer!: BusinessCustomer | null;

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

  @OneToMany(() => OrderDelivery, (delivery) => delivery.order, {
    cascade: ['insert'],
  })
  deliveries!: OrderDelivery[];

  getDeliveredQuantity(productId: string): number {
    if (!this.deliveries) return 0;
    return this.deliveries
      .flatMap((d) => d.items)
      .filter((i) => i.orderItem?.product?.idProduct === productId)
      .reduce((sum, i) => sum + i.quantity, 0);
  }

  getPendingQuantity(productId: string): number {
    if (!this.items) return 0;
    const orderItem = this.items.find(
      (i) => i.product?.idProduct === productId,
    );
    if (!orderItem) return 0;
    return orderItem.quantity - this.getDeliveredQuantity(productId);
  }
}
