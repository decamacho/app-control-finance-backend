import { Module } from '@nestjs/common';
import { SplitsService } from './splits.service';
import { SplitsController } from './splits.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionSplitUser } from './entities/split.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { TransactionDetail } from '../transactions/entities/transaction-detail.entity';
import { TransactionCategory } from '../transactions/entities/transaction-category.entity';
import { TransactionType } from '../transactions/entities/transaction-type.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { WalletUser } from '../wallets/entities/wallet-user.entity';
import { Category } from '../categories/entities/category.entity';
import { User } from '../users/entities/user.entity';
import { TransactionValidatorService } from '../transactions/services/transaction-validator.service';

@Module({
  controllers: [SplitsController],
  providers: [SplitsService, TransactionValidatorService],
  imports: [
    TypeOrmModule.forFeature([
      TransactionSplitUser,
      Transaction,
      TransactionDetail,
      TransactionCategory,
      TransactionType,
      Wallet,
      WalletUser,
      Category,
      User,
    ]),
  ],
  exports: [SplitsService],
})
export class SplitsModule {}
