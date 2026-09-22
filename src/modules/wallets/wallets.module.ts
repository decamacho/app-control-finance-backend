import { Module } from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { WalletsController } from './wallets.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Wallet } from './entities/wallet.entity';
import { WalletType } from './entities/wallet-type.entity';
import { WalletUser } from './entities/wallet-user.entity';
import { TransactionDetail } from '../transactions/entities/transaction-detail.entity';
import { CurrencyService } from './services/currency.service';
import { BalanceService } from './services/balance.service';

@Module({
  controllers: [WalletsController],
  providers: [WalletsService, CurrencyService, BalanceService],
  imports: [
    TypeOrmModule.forFeature([
      Wallet,
      WalletType,
      WalletUser,
      TransactionDetail,
    ]),
  ],
  exports: [TypeOrmModule, WalletsService],
})
export class WalletsModule {}
