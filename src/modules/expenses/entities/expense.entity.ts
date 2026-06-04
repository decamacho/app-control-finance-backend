import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Wallet } from '../../wallets/entities/wallet.entity';
import { Category } from '../../categories/entitites/category.entity';

@Entity('expenses')
export class Expense {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: number;

  @Column({ type: 'date' })
  date!: Date;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({ type: 'varchar', nullable: true })
  receiptUrl!: string;

  @Column({ type: 'varchar', default: 'manual' })
  status!: string;

  @ManyToOne(() => Wallet)
  wallet!: Wallet;

  @ManyToOne(() => Category)
  category!: Category;
}
