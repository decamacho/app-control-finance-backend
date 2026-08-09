import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Wallet } from './wallet.entity';

@Entity('typeWallet')
export class WalletType {
  @PrimaryGeneratedColumn('uuid')
  idTypeWallet!: string;

  @Column({ type: 'varchar', length: 150, unique: true })
  typeWallet!: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  country!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  stateTypeWallet!: string;

  @OneToMany(() => Wallet, (wallet) => wallet.idTypeWallet)
  wallets!: Wallet[];
}
