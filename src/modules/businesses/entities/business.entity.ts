import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Vehicle } from './vehicle.entity';
import { ParkingRate } from './parking-rate.entity';
import { ParkingTicket } from './parking-ticket.entity';
import { BusinessCustomer } from './business-customer.entity';
import { BusinessProduct } from './business-product.entity';
import { BusinessOrder } from './business-order.entity';

export enum BusinessType {
  PARKING = 'PARKING',
  FOOD_SALE = 'FOOD_SALE',
  RETAIL = 'RETAIL',
  OTHER = 'OTHER',
}

@Entity('business')
export class Business {
  @PrimaryGeneratedColumn('uuid')
  idBusiness!: string;

  @Column({ type: 'varchar', length: 150 })
  nameBusiness!: string;

  @Column({ type: 'enum', enum: BusinessType })
  businessType!: BusinessType;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  statusBusiness!: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  modifyAt!: Date;

  @ManyToOne(() => User, (user) => user.businesses, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'idUser' })
  user!: User;

  @OneToMany(() => Vehicle, (vehicle) => vehicle.business)
  vehicles!: Vehicle[];

  @OneToMany(() => ParkingRate, (rate) => rate.business)
  parkingRates!: ParkingRate[];

  @OneToMany(() => ParkingTicket, (ticket) => ticket.business)
  parkingTickets!: ParkingTicket[];

  @OneToMany(() => BusinessCustomer, (customer) => customer.business)
  customers!: BusinessCustomer[];

  @OneToMany(() => BusinessProduct, (product) => product.business)
  products!: BusinessProduct[];

  @OneToMany(() => BusinessOrder, (order) => order.business)
  orders!: BusinessOrder[];
}
