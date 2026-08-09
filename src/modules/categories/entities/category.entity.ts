import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { TransactionCategory } from '../../transactions/entities/transaction-category.entity';
import { Budget } from '../../budgets/entities/budget.entity';

export enum CategoryType {
  EXPENSE = 'EXPENSE',
  INCOME = 'INCOME',
}

@Entity('category')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  idCategory!: string;

  @Column({ type: 'varchar', length: 100 })
  nameCategory!: string;

  @Column({ type: 'varchar', length: 50, default: 'ellipse' })
  iconCategory!: string;

  @Column({ type: 'varchar', length: 6, default: 'ffffff' })
  colorCategory!: string;

  @Column({
    type: 'enum',
    enum: CategoryType,
    default: CategoryType.EXPENSE,
  })
  typeCategory!: CategoryType;

  @OneToMany(
    () => TransactionCategory,
    (expenseCategory) => expenseCategory.categories,
  )
  transactionCategories!: TransactionCategory[];

  @OneToMany(() => Budget, (budget) => budget.category)
  budgets!: Budget[];

  @ManyToOne(() => User, (user) => user.customCategories, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'idUserOwner' })
  userOwner!: User | null;
}
