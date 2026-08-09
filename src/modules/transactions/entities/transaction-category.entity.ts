import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Transaction } from './transaction.entity';
import { Category } from '../../categories/entities/category.entity';

@Entity('transactionCategories')
export class TransactionCategory {
  @PrimaryGeneratedColumn('uuid')
  idTransactionCategory!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  amountAllocated!: number;

  @ManyToOne(
    () => Transaction,
    (transaction) => transaction.transactionCategories,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'idTransaction' })
  transactions!: Transaction;

  @ManyToOne(() => Category, (category) => category.transactionCategories, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'idCategory' })
  categories!: Category;
}
