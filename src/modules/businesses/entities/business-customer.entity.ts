import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Business } from './business.entity';

@Entity('business_customers')
export class BusinessCustomer {
  @PrimaryGeneratedColumn('uuid')
  idCustomer!: string;

  @Column({ type: 'varchar', length: 120 })
  nameCustomer!: string;

  @Column({ type: 'varchar', length: 255 })
  locationCustomer!: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phoneCustomer!: string | null;

  @ManyToOne(() => Business, (business) => business.customers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'idBusiness' })
  business!: Business;
}
