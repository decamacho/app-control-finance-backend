import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Wallet } from './wallet.entity';

@Entity('userWallet')
export class WalletUser {
  @PrimaryGeneratedColumn('uuid')
  idUserWallet!: string;

  @Column({ type: 'varchar', length: 20, default: 'OWNER' })
  roleInWallet!: string;

  @CreateDateColumn({ type: 'timestamp' })
  assignedAt!: Date;

  @ManyToOne(() => User, (user) => user.walletsUsers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'idUser' })
  users!: User;

  @ManyToOne(() => Wallet, (wallet) => wallet.wallets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'idWallet' })
  wallets!: User;
}
