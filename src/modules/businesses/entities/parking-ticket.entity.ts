import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Vehicle } from './vehicle.entity';
import { Payment } from './payment.entity';
import { PaymentStatus } from '../types/payment.enum';

export enum TicketStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity('parking_tickets')
export class ParkingTicket {
  @PrimaryGeneratedColumn('uuid')
  idTicket!: string;

  @Column({ type: 'timestamp' })
  entryTime!: Date;

  @Column({ type: 'timestamp', nullable: true })
  exitTime!: Date | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  totalAmount!: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  paidAmount!: number;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  paymentStatus!: PaymentStatus;

  @Column({ type: 'enum', enum: TicketStatus, default: TicketStatus.ACTIVE })
  statusTicket!: TicketStatus;

  @ManyToOne(() => Vehicle, (vehicle) => vehicle.tickets, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'idVehicle' })
  vehicle!: Vehicle;

  @OneToMany(() => Payment, (payment) => payment.ticket)
  payments!: Payment[];
}
