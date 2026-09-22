import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from '../entities/wallet.entity';
import { WalletUser } from '../entities/wallet-user.entity';
import { TransactionDetail } from '../../transactions/entities/transaction-detail.entity';

@Injectable()
export class BalanceService {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(WalletUser)
    private readonly walletUserRepository: Repository<WalletUser>,
    @InjectRepository(TransactionDetail)
    private readonly detailRepository: Repository<TransactionDetail>,
  ) {}

  async getTotalByCurrency(idUser: string): Promise<Record<string, number>> {
    const walletUsers = await this.walletUserRepository.find({
      where: { users: { idUser } },
      relations: { wallets: true },
    });

    if (walletUsers.length === 0) {
      return {};
    }

    const walletIds = walletUsers.map((wu) => wu.wallets.idWallet);

    const rows = await this.walletRepository
      .createQueryBuilder('wallet')
      .select('wallet.currencyWallet', 'currency')
      .addSelect('COALESCE(SUM(wallet.balanceWallet), 0)', 'total')
      .where('wallet.idWallet IN (:...ids)', { ids: walletIds })
      .andWhere("wallet.stateWallet != 'ARCHIVED'")
      .groupBy('wallet.currencyWallet')
      .getRawMany<{ currency: string; total: string }>();

    const totals: Record<string, number> = {};
    for (const row of rows) {
      totals[row.currency] = Number(row.total);
    }

    return totals;
  }

  async getRealTimeBalance(idWallet: string): Promise<number> {
    const row = await this.detailRepository
      .createQueryBuilder('detail')
      .select('COALESCE(SUM(detail.amountPaid), 0)', 'total')
      .innerJoin('detail.transactions', 'transaction')
      .where('detail.wallets = :idWallet', { idWallet })
      .andWhere("transaction.stateTransaction = 'ACTIVE'")
      .getRawOne<{ total: string }>();

    return Number(row?.total ?? 0);
  }
}
