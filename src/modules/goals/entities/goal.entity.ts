export class Goal {}
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Transaction } from '../../transactions/entities/transaction.entity';

export enum GoalStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity('savingGoal')
export class savingGoal {
  @PrimaryGeneratedColumn('uuid')
  idGoal!: string;

  @Column({ type: 'varchar', length: 150 })
  nameGoal!: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  targetAmount!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0.0 })
  currentAmount!: number;

  @Column({ type: 'date', nullable: true })
  deadline!: Date | null;

  @Column({
    type: 'enum',
    enum: GoalStatus,
    default: GoalStatus.ACTIVE,
  })
  statusGoal!: GoalStatus;

  @OneToMany(() => Transaction, (transaction) => transaction.goal)
  transactions!: Transaction[];
}
