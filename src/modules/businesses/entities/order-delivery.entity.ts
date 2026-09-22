import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BusinessOrder } from './business-order.entity';
import { OrderDeliveryItem } from './order-delivery-item.entity';
import { DeliveryStatus } from '../types/delivery-status.enum';

@Entity('order_deliveries')
export class OrderDelivery {
  @PrimaryGeneratedColumn('uuid')
  idDelivery!: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  deliveredAt!: Date;

  @Column({
    type: 'enum',
    enum: DeliveryStatus,
    default: DeliveryStatus.NOT_DELIVERED,
  })
  status!: DeliveryStatus;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @ManyToOne(() => BusinessOrder, (order) => order.deliveries, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'idOrder' })
  order!: BusinessOrder;

  @OneToMany(() => OrderDeliveryItem, (item) => item.delivery, {
    cascade: true,
  })
  items!: OrderDeliveryItem[];
}
