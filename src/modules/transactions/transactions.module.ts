import { Module } from '@nestjs/common';
import { TransactionsService } from './services/transactions.service';
import { TransactionsController } from './controllers/transactions.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from './entities/transaction.entity';
import { TransactionDetail } from './entities/transaction-detail.entity';
import { TransactionType } from './entities/transaction-type.entity';
import { Alert } from '../alerts/entities/alert.entity';
import { TransactionSplitUser } from '../splits/entities/split.entity';
import { savingGoal } from '../goals/entities/goal.entity';
import { TypeTransactionService } from './services/transaction-type.service';
import { TypeTransactionsController } from './controllers/transactions-type.controller';

@Module({
  controllers: [TransactionsController, TypeTransactionsController],
  providers: [TransactionsService, TypeTransactionService],
  imports: [
    TypeOrmModule.forFeature([
      Transaction,
      TransactionDetail,
      TransactionType,
      Alert,
      TransactionSplitUser,
      savingGoal,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class TransactionsModule {}
