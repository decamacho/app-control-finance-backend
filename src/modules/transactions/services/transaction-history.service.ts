import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../entities/transaction.entity';
import { HistoryQueryDto, PendingQueryDto } from '../dto/transaction.dto';

interface TransactionHistoryItem {
  idTransaction: string;
  amount: number;
  currencyTransaction: string;
  description: string | null;
  transactionDate: Date;
  typeTransaction: string | undefined;
  stateTransaction: string;
  isRecurring: boolean;
  recurrencePattern: string | null;
  idParentTransaction: string | null;
  wallet: { idWallet: string; nameWallet: string } | null;
  category: { idCategory: string; nameCategory: string } | null;
}

@Injectable()
export class TransactionHistoryService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  async findHistory(filters: HistoryQueryDto, idUser: string) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const queryBuilder = this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoin('transaction.details', 'detail')
      .leftJoin('detail.wallets', 'wallet')
      .innerJoin(
        'wallet.wallets',
        'userWallet',
        'userWallet.idUser = :idUser',
        { idUser },
      )
      .leftJoin('transaction.typeTransaction', 'type')
      .leftJoin('transaction.transactionCategories', 'txCategory')
      .leftJoin('txCategory.categories', 'category')
      .where('transaction.stateTransaction = :state', { state: 'ACTIVE' })
      .select('transaction')
      .addSelect([
        'type.typeTransaction',
        'detail.idDetail',
        'wallet.idWallet',
        'wallet.nameWallet',
        'txCategory.idTransactionCategory',
        'category.idCategory',
        'category.nameCategory',
      ])
      .distinct(true);

    if (filters.fromDate) {
      queryBuilder.andWhere('transaction.transactionDate >= :fromDate', {
        fromDate: filters.fromDate,
      });
    }

    if (filters.toDate) {
      queryBuilder.andWhere('transaction.transactionDate <= :toDate', {
        toDate: filters.toDate,
      });
    }

    if (filters.typeTransaction) {
      queryBuilder.andWhere('type.typeTransaction = :typeTransaction', {
        typeTransaction: filters.typeTransaction,
      });
    }

    if (filters.idWallet) {
      queryBuilder.andWhere('wallet.idWallet = :idWallet', {
        idWallet: filters.idWallet,
      });
    }

    if (filters.idCategory) {
      queryBuilder.andWhere('category.idCategory = :idCategory', {
        idCategory: filters.idCategory,
      });
    }

    queryBuilder
      .orderBy('transaction.transactionDate', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      data: {
        items: items.map((transaction) => this.serialize(transaction)),
        total,
        page,
        limit,
      },
      message: 'Historial de transacciones obtenido exitosamente',
    };
  }

  async findPending(query: PendingQueryDto, idUser: string) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const queryBuilder = this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoin('transaction.details', 'detail')
      .leftJoin('detail.wallets', 'wallet')
      .innerJoin(
        'wallet.wallets',
        'userWallet',
        'userWallet.idUser = :idUser',
        { idUser },
      )
      .leftJoin('transaction.typeTransaction', 'type')
      .where('transaction.stateTransaction = :state', { state: 'ACTIVE' })
      .andWhere('transaction.transactionDate > :now', { now: new Date() })
      .select('transaction')
      .addSelect([
        'type.typeTransaction',
        'detail.idDetail',
        'wallet.idWallet',
        'wallet.nameWallet',
      ])
      .distinct(true)
      .orderBy('transaction.transactionDate', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      data: {
        items: items.map((transaction) => this.serialize(transaction)),
        total,
        page,
        limit,
      },
      message: 'Transacciones pendientes obtenidas exitosamente',
    };
  }

  private serialize(transaction: Transaction): TransactionHistoryItem {
    const detail = transaction.details?.[0];
    const wallet = detail?.wallets;
    const category = transaction.transactionCategories?.[0]?.categories;

    return {
      idTransaction: transaction.idTransaction,
      amount: Number(transaction.amount),
      currencyTransaction: transaction.currencyTransaction,
      description: transaction.description,
      transactionDate: transaction.transactionDate,
      typeTransaction: transaction.typeTransaction?.typeTransaction,
      stateTransaction: transaction.stateTransaction,
      isRecurring: transaction.isRecurring,
      recurrencePattern: transaction.recurrencePattern,
      idParentTransaction: transaction.idParentTransaction,
      wallet: wallet
        ? { idWallet: wallet.idWallet, nameWallet: wallet.nameWallet }
        : null,
      category: category
        ? {
            idCategory: category.idCategory,
            nameCategory: category.nameCategory,
          }
        : null,
    };
  }
}
