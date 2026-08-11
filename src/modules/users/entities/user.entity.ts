import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Role } from './role.entity';
import { WalletUser } from '../../wallets/entities/wallet-user.entity';
import { Category } from '../../categories/entities/category.entity';
import { Business } from '../../businesses/entities/business.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  idUser!: string;

  @Column({ type: 'varchar', length: 100 })
  nameUser!: string;

  @Column({ type: 'varchar', length: 100 })
  firstNameUser!: string;

  @Column({ type: 'varchar', length: 100 })
  lastNameUser!: string;

  @Column({ type: 'varchar', length: 150, unique: true })
  emailUser!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  passwordUser!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phoneNumberUser!: string | null;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
  googleIdUser!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  statusUser!: string;

  @Column({ type: 'boolean', default: false })
  isVerifyUser!: boolean;

  @Column({ type: 'varchar', length: 50, nullable: true })
  countryUser!: string | null;

  @Column({ type: 'varchar', length: 3, default: 'COP' })
  currencyDefault!: string;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginUser!: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  modifyAt!: Date;

  @ManyToOne(() => Role, (role) => role.users, { eager: true })
  @JoinColumn({ name: 'idRole' })
  role!: Role;

  @OneToMany(() => WalletUser, (walletUser) => walletUser.users)
  walletsUsers!: WalletUser[];

  @OneToMany(() => Category, (category) => category.userOwner)
  customCategories!: Category[];

  @OneToMany(() => Business, (business) => business.user)
  businesses!: Business[];
}
