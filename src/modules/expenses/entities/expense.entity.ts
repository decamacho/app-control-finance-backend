import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Wallet } from '../../wallets/entities/wallet.entity';
import { Category } from '../../categories/entitites/category.entity';

@Entity('expenses')
export class Expense {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: number; // Monto del gasto

  @Column({ type: 'date' })
  date!: Date; // Fecha del gasto

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({ type: 'varchar', nullable: true })
  receiptUrl!: string; // La URL de la foto en AWS S3

  @Column({ type: 'varchar', default: 'manual' })
  status!: string; // Ej: 'procesado_ia', 'manual'

  // Relaciones: Un gasto pertenece a UNA billetera y a UNA categoría
  @ManyToOne(() => Wallet)
  wallet!: Wallet;

  @ManyToOne(() => Category)
  category!: Category;
}
