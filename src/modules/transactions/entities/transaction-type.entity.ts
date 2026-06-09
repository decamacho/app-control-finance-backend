import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Transaction } from './transaction.entity';

@Entity('typeTransaction')
export class TransactionType {
  @PrimaryGeneratedColumn('uuid')
  idTypeTransaction!: string;

  @Column({ type: 'varchar', length: 150, unique: true })
  typeTransaction!: string;

  @Column({ type: 'boolean', default: true })
  stateTypeTransaction!: boolean;

  @OneToMany(() => Transaction, (transaction) => transaction.typeTransaction)
  transactions!: Transaction[];
}
