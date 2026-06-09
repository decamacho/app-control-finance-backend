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
import { TransactionType } from './transaction-type.entity';
import { Alert } from '../../alerts/entities/alert.entity';
import { TransactionDetail } from './transaction-detail.entity';
import { TransactionCategory } from './transaction-category.entity';
import { TransactionSplitUser } from '../../splits/entities/split.entity';
import { savingGoal } from '../../goals/entities/goal.entity';

@Entity('transaction')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  idTransaction!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description!: string | null;

  @Column({ type: 'timestamp' })
  transactionDate!: Date;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updateAt!: Date;

  @ManyToOne(
    () => TransactionType,
    (transactionType) => transactionType.transactions,
    {
      eager: true,
    },
  )
  @JoinColumn({ name: 'idTypeTransaction' })
  typeTransaction!: TransactionType;

  @ManyToOne(() => savingGoal, (goal) => goal.transactions, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'idGoal' })
  goal!: savingGoal | null;

  @OneToMany(() => Alert, (alert) => alert.transactions)
  alertTransaction!: Alert;

  @OneToMany(() => TransactionDetail, (detail) => detail.transactions, {
    cascade: true,
  })
  details!: TransactionDetail[];

  @OneToMany(() => TransactionSplitUser, (split) => split.transactions, {
    cascade: true,
  })
  splits!: TransactionSplitUser[];

  @OneToMany(() => TransactionCategory, (expCat) => expCat.transactions, {
    cascade: true,
  })
  transactionCategories!: TransactionCategory[];
}
