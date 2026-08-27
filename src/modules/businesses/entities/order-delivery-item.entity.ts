import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { OrderDelivery } from './order-delivery.entity';
import { BusinessOrderItem } from './business-order-item.entity';

@Entity('order_delivery_items')
export class OrderDeliveryItem {
  @PrimaryGeneratedColumn('uuid')
  idDeliveryItem!: string;

  @Column({ type: 'int' })
  quantity!: number;

  @ManyToOne(() => OrderDelivery, (delivery) => delivery.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'idDelivery' })
  delivery!: OrderDelivery;

  @ManyToOne(() => BusinessOrderItem, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'idOrderItem' })
  orderItem!: BusinessOrderItem;
}
