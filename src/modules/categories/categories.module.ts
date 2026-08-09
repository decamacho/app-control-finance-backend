import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionCategory } from '../transactions/entities/transaction-category.entity';
import { Budget } from '../budgets/entities/budget.entity';

@Module({
  controllers: [CategoriesController],
  providers: [CategoriesService],
  imports: [TypeOrmModule.forFeature([TransactionCategory, Budget])],
  exports: [TypeOrmModule],
})
export class CategoriesModule {}
