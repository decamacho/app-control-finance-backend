import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Business } from './business.entity';

@Entity('business_products')
export class BusinessProduct {
  @PrimaryGeneratedColumn('uuid')
  idProduct!: string;

  @Column({ type: 'varchar', length: 120 })
  nameProduct!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  basePrice!: number;

  @ManyToOne(() => Business, (business) => business.products, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'idBusiness' })
  business!: Business;
}
