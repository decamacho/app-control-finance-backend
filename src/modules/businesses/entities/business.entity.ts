import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

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
}
