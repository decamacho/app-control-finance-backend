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
import { WalletType } from './wallet-type.entity';
import { WalletUser } from './wallet-user.entity';
import { TransactionDetail } from '../../transactions/entities/transaction-detail.entity';

@Entity('wallet')
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  idWallet!: string;

  @Column({ type: 'varchar', length: 150 })
  nameWallet!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  balanceWallet!: number;

  @Column({ type: 'varchar', length: 3, default: 'COP' })
  currencyWallet!: string;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  stateWallet!: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  modifyAt!: Date;

  @ManyToOne(() => WalletType, (type) => type.wallets, { eager: true })
  @JoinColumn({ name: 'idTypeWallet' })
  idTypeWallet!: WalletType;

  @OneToMany(() => WalletUser, (walletUser) => walletUser.wallets)
  wallets!: WalletUser[];

  @OneToMany(() => TransactionDetail, (detail) => detail.wallets)
  transactionDetail!: TransactionDetail[];
}
