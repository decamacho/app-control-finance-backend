import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BusinessCustomer } from './business-customer.entity';
import { BusinessProduct } from './business-product.entity';

@Entity('customer_product_prices')
export class CustomerProductPrice {
  @PrimaryGeneratedColumn('uuid')
  idCustomerProductPrice!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  customPrice!: number;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  modifyAt!: Date;

  @ManyToOne(() => BusinessCustomer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'idCustomer' })
  customer!: BusinessCustomer;

  @ManyToOne(() => BusinessProduct, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'idProduct' })
  product!: BusinessProduct;
}
