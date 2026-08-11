import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BusinessOrder } from './business-order.entity';
import { ParkingTicket } from './parking-ticket.entity';
import { PaymentMethod } from '../types/payment.enum';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  idPayment!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: number;

  @Column({ type: 'enum', enum: PaymentMethod })
  paymentMethod!: PaymentMethod;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @ManyToOne(() => BusinessOrder, (order) => order.payments, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'idOrder' })
  order!: BusinessOrder | null;

  @ManyToOne(() => ParkingTicket, (ticket) => ticket.payments, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'idTicket' })
  ticket!: ParkingTicket | null;
}
