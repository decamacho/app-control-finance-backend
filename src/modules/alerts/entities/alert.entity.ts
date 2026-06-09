import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Transaction } from '../../transactions/entities/transaction.entity';

@Entity('alert')
export class Alert {
  @PrimaryGeneratedColumn('uuid')
  idAlert!: string;

  @Column({ type: 'varchar', length: 255 })
  messageAlert!: string;

  @Column({ type: 'boolean', default: false })
  isRead!: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @ManyToOne(() => Transaction, (transaction) => transaction.alertTransaction)
  @JoinColumn({ name: 'idTransaction' })
  transactions!: User[];
}
