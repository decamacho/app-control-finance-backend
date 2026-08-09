import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Transaction } from './transaction.entity';
import { ValidTransactionTypes } from '../types/transactios-type.enum';

@Entity('typeTransaction')
export class TransactionType {
  @PrimaryGeneratedColumn('uuid')
  idTypeTransaction!: string;

  @Column({ type: 'enum', enum: ValidTransactionTypes, unique: true })
  typeTransaction!: ValidTransactionTypes;

  @Column({ type: 'boolean', default: true })
  stateTypeTransaction!: boolean;

  @OneToMany(() => Transaction, (transaction) => transaction.typeTransaction)
  transactions!: Transaction[];
}
