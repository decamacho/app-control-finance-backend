import { Module } from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { WalletsController } from './wallets.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Wallet } from './entities/wallet.entity';
import { WalletType } from './entities/wallet-type.entity';
import { WalletUser } from './entities/wallet-user.entity';
import { TransactionDetail } from '../transactions/entities/transaction-detail.entity';

@Module({
  controllers: [WalletsController],
  providers: [WalletsService],
  imports: [
    TypeOrmModule.forFeature([
      Wallet,
      WalletType,
      WalletUser,
      TransactionDetail,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class WalletsModule {}
