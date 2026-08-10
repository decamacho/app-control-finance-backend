import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Transaction } from '../entities/transaction.entity';
import { TransactionDetail } from '../entities/transaction-detail.entity';
import { TransactionCategory } from '../entities/transaction-category.entity';
import { Wallet } from '../../wallets/entities/wallet.entity';
import { savingGoal, GoalStatus } from '../../goals/entities/goal.entity';
import {
  SplitStatus,
  TransactionSplitUser,
} from '../../splits/entities/split.entity';
import { Category } from '../../categories/entities/category.entity';
import { ValidTransactionTypes } from '../types/transactios-type.enum';
import { CreateTransactionDto, RefundDto } from '../dto/transaction.dto';
import { TransactionValidatorService } from './transaction-validator.service';
import { serializeTransaction } from './transaction.serializer';
import { TransactionSign } from './transaction-validator.service';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(TransactionDetail)
    private readonly detailRepository: Repository<TransactionDetail>,
    @InjectRepository(TransactionCategory)
    private readonly categoryRepository: Repository<TransactionCategory>,
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(savingGoal)
    private readonly goalRepository: Repository<savingGoal>,
    @InjectRepository(TransactionSplitUser)
    private readonly splitRepository: Repository<TransactionSplitUser>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly validator: TransactionValidatorService,
  ) {}

  async create(dto: CreateTransactionDto, idUser: string) {
    this.validator.validateAmount(dto.amount);
    const wallet = await this.validator.validateWalletForUser(
      dto.idWallet,
      idUser,
    );
    this.validator.validateCurrency(wallet, dto.currency);
    const type = await this.validator.validateTransactionType(
      dto.idTypeTransaction,
    );

    if (type.typeTransaction === ValidTransactionTypes.TRANSFER) {
      throw new BadRequestException(
        'Las transferencias deben usar el endpoint de transferencia',
      );
    }

    const sign = this.validator.getSign(type.typeTransaction);

    if (dto.idCategory) {
      await this.validator.validateCategory(dto.idCategory, sign);
    }

    if (dto.idGoal) {
      await this.validateGoal(dto.idGoal);
    }

    if (sign < 0) {
      this.validator.validateBalance(wallet, dto.amount);
    }

    const result = await this.dataSource.transaction(async (manager) => {
      const walletRepository = manager.getRepository(Wallet);
      const walletLocked = await walletRepository.findOne({
        where: { idWallet: dto.idWallet },
      });

      if (!walletLocked) {
        throw new NotFoundException('Billetera no encontrada');
      }

      if (sign < 0 && Number(walletLocked.balanceWallet) < dto.amount) {
        throw new BadRequestException('Saldo insuficiente en la billetera');
      }

      const transaction = this.transactionRepository.create({
        amount: dto.amount,
        description: dto.description ?? null,
        currencyTransaction: dto.currency ?? walletLocked.currencyWallet,
        transactionDate: dto.transactionDate ?? new Date(),
        isRecurring: dto.isRecurring ?? false,
        recurrencePattern: dto.recurrencePattern ?? null,
        typeTransaction: type,
        goal: dto.idGoal ? { idGoal: dto.idGoal } : null,
        details: [
          this.detailRepository.create({
            amountPaid: sign < 0 ? -dto.amount : dto.amount,
            wallets: walletLocked,
          }),
        ],
      });

      if (dto.idCategory) {
        transaction.transactionCategories = [
          this.categoryRepository.create({
            amountAllocated: dto.amount,
            categories: { idCategory: dto.idCategory } as Category,
          }),
        ];
      }

      const saved = await manager.save(Transaction, transaction);

      walletLocked.balanceWallet =
        Number(walletLocked.balanceWallet) + sign * dto.amount;
      await walletRepository.save(walletLocked);

      if (dto.idGoal) {
        await this.applyGoalContribution(manager, dto.idGoal, dto.amount, sign);
      }

      return saved;
    });

    return {
      data: serializeTransaction(result),
      message: 'Transacción creada exitosamente',
    };
  }

  async refund(idTransaction: string, dto: RefundDto, idUser: string) {
    const original = await this.transactionRepository.findOne({
      where: { idTransaction, stateTransaction: 'ACTIVE' },
      relations: {
        details: { wallets: true },
        typeTransaction: true,
        goal: true,
      },
    });

    if (!original) {
      throw new NotFoundException('Transacción no encontrada');
    }

    if (original.idParentTransaction) {
      throw new BadRequestException(
        'No se puede reembolsar una transacción vinculada a otra',
      );
    }

    const originalWallet = original.details?.[0]?.wallets;
    if (!originalWallet) {
      throw new BadRequestException(
        'La transacción no tiene una billetera asociada',
      );
    }

    await this.validator.validateWalletForUser(originalWallet.idWallet, idUser);

    await this.assertNoPendingSplits(original.idTransaction);

    const originalSign = this.validator.getSign(
      original.typeTransaction.typeTransaction,
    );

    if (originalSign === 0) {
      throw new BadRequestException('No se puede reembolsar una transferencia');
    }

    const existingRefund = await this.transactionRepository.findOne({
      where: {
        idParentTransaction: original.idTransaction,
        stateTransaction: 'ACTIVE',
      },
    });

    if (existingRefund) {
      throw new ConflictException('Esta transacción ya fue reembolsada');
    }

    const refundAmount = dto.amount ?? Number(original.amount);
    if (refundAmount > Number(original.amount)) {
      throw new BadRequestException(
        'El monto del reembolso no puede superar el monto original',
      );
    }

    const refundSign = -originalSign as TransactionSign;
    const targetWallet = dto.idWallet
      ? await this.validator.validateWalletForUser(dto.idWallet, idUser)
      : originalWallet;

    const result = await this.dataSource.transaction(async (manager) => {
      const walletRepository = manager.getRepository(Wallet);
      const walletLocked = await walletRepository.findOne({
        where: { idWallet: targetWallet.idWallet },
      });

      if (!walletLocked) {
        throw new NotFoundException('Billetera no encontrada');
      }

      const refundTransaction = this.transactionRepository.create({
        amount: refundAmount,
        description:
          dto.description ??
          `Reembolso de: ${original.description ?? original.idTransaction}`,
        currencyTransaction: walletLocked.currencyWallet,
        transactionDate: new Date(),
        idParentTransaction: original.idTransaction,
        typeTransaction: original.typeTransaction,
        details: [
          this.detailRepository.create({
            amountPaid: refundSign < 0 ? -refundAmount : refundAmount,
            wallets: walletLocked,
          }),
        ],
      });

      const saved = await manager.save(Transaction, refundTransaction);

      walletLocked.balanceWallet =
        Number(walletLocked.balanceWallet) + refundSign * refundAmount;
      await walletRepository.save(walletLocked);

      if (original.goal) {
        await this.applyGoalContribution(
          manager,
          original.goal.idGoal,
          refundAmount,
          refundSign,
        );
      }

      return saved;
    });

    return {
      data: serializeTransaction(result),
      message: 'Transacción reembolsada exitosamente',
    };
  }

  async cancel(idTransaction: string, idUser: string) {
    const transaction = await this.transactionRepository.findOne({
      where: { idTransaction, stateTransaction: 'ACTIVE' },
      relations: {
        details: { wallets: true },
        typeTransaction: true,
        goal: true,
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transacción no encontrada');
    }

    const wallet = transaction.details?.[0]?.wallets;
    if (!wallet) {
      throw new BadRequestException(
        'La transacción no tiene una billetera asociada',
      );
    }

    await this.validator.validateWalletForUser(wallet.idWallet, idUser);

    await this.assertNoPendingSplits(transaction.idTransaction);

    const sign = this.validator.getSign(
      transaction.typeTransaction.typeTransaction,
    );

    if (sign === 0) {
      throw new BadRequestException(
        'Las transferencias no pueden cancelarse directamente',
      );
    }

    if (transaction.idParentTransaction) {
      throw new BadRequestException(
        'Las transacciones vinculadas deben cancelarse desde su origen',
      );
    }

    await this.dataSource.transaction(async (manager) => {
      const walletRepository = manager.getRepository(Wallet);
      const walletLocked = await walletRepository.findOne({
        where: { idWallet: wallet.idWallet },
      });

      if (walletLocked) {
        walletLocked.balanceWallet =
          Number(walletLocked.balanceWallet) -
          sign * Number(transaction.amount);
        await walletRepository.save(walletLocked);
      }

      await manager.update(Transaction, transaction.idTransaction, {
        stateTransaction: 'INACTIVE',
      });

      if (transaction.goal) {
        await this.applyGoalContribution(
          manager,
          transaction.goal.idGoal,
          Number(transaction.amount),
          -sign as TransactionSign,
        );
      }
    });

    return {
      data: null,
      message: 'Transacción cancelada exitosamente',
    };
  }

  private async validateGoal(idGoal: string): Promise<void> {
    const goal = await this.goalRepository.findOne({ where: { idGoal } });

    if (!goal) {
      throw new NotFoundException('Meta de ahorro no encontrada');
    }
  }

  private async assertNoPendingSplits(idTransaction: string): Promise<void> {
    const pendingSplit = await this.splitRepository.findOne({
      where: {
        transactions: { idTransaction },
        statusSplit: SplitStatus.PENDING,
      },
    });

    if (pendingSplit) {
      throw new BadRequestException(
        'La transacción tiene división pendiente; no se puede operar sobre ella',
      );
    }
  }

  private async applyGoalContribution(
    manager: EntityManager,
    idGoal: string,
    amount: number,
    sign: TransactionSign,
  ): Promise<void> {
    const goalRepository = manager.getRepository(savingGoal);
    const goal = await goalRepository.findOne({ where: { idGoal } });

    if (!goal) {
      return;
    }

    goal.currentAmount = Number(goal.currentAmount) + sign * amount;

    if (
      goal.currentAmount >= Number(goal.targetAmount) &&
      goal.statusGoal === GoalStatus.ACTIVE
    ) {
      goal.statusGoal = GoalStatus.COMPLETED;
    } else if (
      goal.currentAmount < Number(goal.targetAmount) &&
      goal.statusGoal === GoalStatus.COMPLETED
    ) {
      goal.statusGoal = GoalStatus.ACTIVE;
    }

    await goalRepository.save(goal);
  }
}
