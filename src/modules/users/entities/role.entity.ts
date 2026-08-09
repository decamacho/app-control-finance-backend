import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { User } from './user.entity';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  idRole!: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  nameRole!: string;

  @Column({ type: 'boolean', default: true })
  stateRole!: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @OneToMany(() => User, (user) => user.role)
  users!: User[];
}
