import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Transaction } from '../../transactions/entities/transaction.entity';
import { User } from '../../users/entities/user.entity';

export enum SplitType {
  TO_COLLECT = 'TO_COLLECT',
  TO_PAY = 'TO_PAY',
}

export enum SplitStatus {
  PENDING = 'PENDING',
  SETTLED = 'SETTLED',
}

export enum SplitMethod {
  EQUAL = 'EQUAL',
  PERCENTAGE = 'PERCENTAGE',
  EXACT = 'EXACT',
  SHARES = 'SHARES',
}

@Entity('transactionSplitsUsers')
export class TransactionSplitUser {
  @PrimaryGeneratedColumn('uuid')
  idSplit!: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amountSplit!: number;

  @Column({
    type: 'enum',
    enum: SplitType,
  })
  splitType!: SplitType;

  @Column({
    type: 'enum',
    enum: SplitStatus,
    default: SplitStatus.PENDING,
  })
  statusSplit!: SplitStatus;

  @Column({
    type: 'enum',
    enum: SplitMethod,
    nullable: true,
  })
  splitMethod!: SplitMethod | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  friendName!: string | null;

  @ManyToOne(() => Transaction, (transaction) => transaction.splits, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'idTransaction' })
  transactions!: Transaction;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'idUserDebtor' })
  userDebtor!: User | null;
}
