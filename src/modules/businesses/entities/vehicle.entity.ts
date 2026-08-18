import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Business } from './business.entity';
import { ParkingTicket } from './parking-ticket.entity';

export enum VehicleType {
  MOTO = 'MOTO',
  CARRO = 'CARRO',
  CAMIONETA = 'CAMIONETA',
}

@Entity('vehicles')
@Index(['business', 'licensePlate'], { unique: true })
export class Vehicle {
  @PrimaryGeneratedColumn('uuid')
  idVehicle!: string;

  @Column({ type: 'varchar', length: 12 })
  licensePlate!: string;

  @Column({ type: 'enum', enum: VehicleType })
  vehicleType!: VehicleType;

  @Column({ type: 'varchar', length: 50 })
  color!: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  brand!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  model!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  photoUrl!: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  ownerName!: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phoneOwner!: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  emailOwner!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  monthlyStartDate!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  monthlyEndDate!: Date | null;

  @ManyToOne(() => Business, (business) => business.vehicles, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'idBusiness' })
  business!: Business;

  @OneToMany(() => ParkingTicket, (ticket) => ticket.vehicle)
  tickets!: ParkingTicket[];
}
