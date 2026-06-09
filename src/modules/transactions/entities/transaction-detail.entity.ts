import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Transaction } from './transaction.entity';
import { Wallet } from '../../wallets/entities/wallet.entity';

@Entity('transactionDetails')
export class TransactionDetail {
  @PrimaryGeneratedColumn('uuid')
  idDetail!: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amountPaid!: number;

  @ManyToOne(() => Transaction, (transaction) => transaction.details, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'idTransaction' })
  transactions!: Transaction;

  @ManyToOne(() => Wallet, (wallet) => wallet.transactionDetail, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'idWallet' })
  wallets!: Wallet;
}
