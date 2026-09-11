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

  @Column({ type: 'varchar', length: 150, nullable: true })
  emailCustomer!: string | null;

  @Column({ type: 'text', nullable: true })
  descriptionCustomer!: string | null;

  @ManyToOne(() => Business, (business) => business.customers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'idBusiness' })
  business!: Business;
}
