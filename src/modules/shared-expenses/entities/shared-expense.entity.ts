import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Expense } from '../../expenses/entities/expense.entity';

@Entity('shared_expenses')
export class SharedExpense {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amountOwed!: number;

  @Column({ type: 'boolean', default: false })
  isPaid!: boolean;

  @ManyToOne(() => Expense)
  originalExpense!: Expense;
}
