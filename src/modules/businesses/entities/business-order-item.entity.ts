import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BusinessOrder } from './business-order.entity';
import { BusinessProduct } from './business-product.entity';

@Entity('business_order_items')
export class BusinessOrderItem {
  @PrimaryGeneratedColumn('uuid')
  idOrderItem!: string;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  unitPrice!: number; // Precio pactado (puede diferir del basePrice)

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  subtotal!: number; // quantity * unitPrice

  @ManyToOne(() => BusinessOrder, (order) => order.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'idOrder' })
  order!: BusinessOrder;

  @ManyToOne(() => BusinessProduct, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'idProduct' })
  product!: BusinessProduct;
}
