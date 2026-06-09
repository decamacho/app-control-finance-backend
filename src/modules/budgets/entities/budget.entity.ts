import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Category } from '../../categories/entities/category.entity';

@Entity('budget')
export class Budget {
  @PrimaryGeneratedColumn('uuid')
  idBudget!: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amountLimit!: number;

  @Column({ type: 'date' })
  startDate!: Date;

  @Column({ type: 'date' })
  endDate!: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'idUser' })
  user!: User;

  @ManyToOne(() => Category, (category) => category.budgets, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'idCategory' })
  category!: Category;
}
