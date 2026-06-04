import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExpensesModule } from './modules/expenses/expenses.module';

import { Expense } from './modules/expenses/entities/expense.entity';
import { Wallet } from './modules/wallets/entities/wallet.entity';
import { Category } from './modules/categories/entitites/category.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      autoLoadEntities: true,
      entities: [Expense, Wallet, Category],
      synchronize: true,
      logging: true,
    }),
    ExpensesModule,
  ],
})
export class AppModule {}
