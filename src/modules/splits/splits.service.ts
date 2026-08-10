import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Transaction } from '../transactions/entities/transaction.entity';
import { TransactionDetail } from '../transactions/entities/transaction-detail.entity';
import { TransactionCategory } from '../transactions/entities/transaction-category.entity';
import {
  SplitMethod,
  SplitStatus,
  SplitType,
  TransactionSplitUser,
} from './entities/split.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { User } from '../users/entities/user.entity';
import { Category } from '../categories/entities/category.entity';
import { ValidTransactionTypes } from '../transactions/types/transactios-type.enum';
import { SplitTransactionDto } from '../transactions/dto/transaction.dto';
import { TransactionValidatorService } from '../transactions/services/transaction-validator.service';
import { serializeTransaction } from '../transactions/services/transaction.serializer';
import { CreateSplitDto } from './dto/create-split.dto';
import { UpdateSplitDto } from './dto/update-split.dto';

@Injectable()
export class SplitsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(TransactionDetail)
    private readonly detailRepository: Repository<TransactionDetail>,
    @InjectRepository(TransactionSplitUser)
    private readonly splitRepository: Repository<TransactionSplitUser>,
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(TransactionCategory)
    private readonly categoryRepository: Repository<TransactionCategory>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly validator: TransactionValidatorService,
  ) {}

  create(createSplitDto: CreateSplitDto) {
    void createSplitDto;
    return 'This action adds a new split';
  }

  findAll() {
    return `This action returns all splits`;
  }

  findOne(id: number) {
    return `This action returns a #${id} split`;
  }

  update(id: number, updateSplitDto: UpdateSplitDto) {
    void updateSplitDto;
    return `This action updates a #${id} split`;
  }

  remove(id: number) {
    return `This action removes a #${id} split`;
  }

  async createSplitTransaction(dto: SplitTransactionDto, idUser: string) {
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
      throw new BadRequestException('Las transferencias no admiten división');
    }

    const sign = this.validator.getSign(type.typeTransaction);

    if (dto.idCategory) {
      await this.validator.validateCategory(dto.idCategory, sign);
    }

    await this.validateParticipants(dto);

    const amounts = this.computeSplitAmounts(dto);
    const totalSplit = amounts.reduce((sum, amount) => sum + amount, 0);

    if (Math.abs(totalSplit - dto.amount) > 0.01) {
      throw new BadRequestException(
        'La suma de los montos del split no coincide con el monto total',
      );
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
        description: dto.description ?? 'Transacción dividida',
        currencyTransaction: dto.currency ?? walletLocked.currencyWallet,
        transactionDate: dto.transactionDate ?? new Date(),
        isRecurring: dto.isRecurring ?? false,
        recurrencePattern: dto.recurrencePattern ?? null,
        typeTransaction: type,
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

      const savedTransaction = await manager.save(Transaction, transaction);

      const splits = dto.participants.map((participant, index) =>
        this.splitRepository.create({
          amountSplit: amounts[index],
          splitType: SplitType.TO_COLLECT,
          splitMethod: dto.splitMethod,
          statusSplit: SplitStatus.PENDING,
          friendName: participant.friendName ?? null,
          userDebtor: participant.idUserDebtor
            ? { idUser: participant.idUserDebtor }
            : null,
          transactions: savedTransaction,
        }),
      );

      const savedSplits = await manager.save(TransactionSplitUser, splits);

      walletLocked.balanceWallet =
        Number(walletLocked.balanceWallet) + sign * dto.amount;
      await walletRepository.save(walletLocked);

      return { transaction: savedTransaction, splits: savedSplits };
    });

    return {
      data: {
        transaction: serializeTransaction(result.transaction),
        splits: result.splits.map((split) => ({
          idSplit: split.idSplit,
          amountSplit: Number(split.amountSplit),
          splitType: split.splitType,
          splitMethod: split.splitMethod,
          statusSplit: split.statusSplit,
          friendName: split.friendName,
          idUserDebtor: split.userDebtor?.idUser ?? null,
        })),
      },
      message: 'Transacción dividida exitosamente',
    };
  }

  private async validateParticipants(dto: SplitTransactionDto): Promise<void> {
    for (const participant of dto.participants) {
      if (!participant.idUserDebtor) {
        continue;
      }

      const user = await this.userRepository.findOne({
        where: { idUser: participant.idUserDebtor },
      });

      if (!user) {
        throw new NotFoundException(
          `El participante con id ${participant.idUserDebtor} no existe`,
        );
      }
    }
  }

  private computeSplitAmounts(dto: SplitTransactionDto): number[] {
    const { participants, amount, splitMethod } = dto;

    switch (splitMethod) {
      case SplitMethod.EQUAL: {
        const count = participants.length;
        const base = this.roundTwo(amount / count);
        const amounts = Array(count).fill(base) as number[];
        const remainder = this.roundTwo(amount - base * count);
        amounts[0] = this.roundTwo(base + remainder);
        return amounts;
      }

      case SplitMethod.PERCENTAGE: {
        const totalPercentage = participants.reduce(
          (sum, participant) => sum + (participant.percentage ?? 0),
          0,
        );

        if (Math.abs(totalPercentage - 100) > 0.01) {
          throw new BadRequestException(
            'La suma de los porcentajes debe ser 100',
          );
        }

        return participants.map((participant) =>
          this.roundTwo((amount * (participant.percentage ?? 0)) / 100),
        );
      }

      case SplitMethod.EXACT: {
        return participants.map((participant) => {
          if (!participant.amountSplit || participant.amountSplit <= 0) {
            throw new BadRequestException(
              'Cada participante debe indicar un monto exacto',
            );
          }
          return participant.amountSplit;
        });
      }

      case SplitMethod.SHARES: {
        const totalShares = participants.reduce(
          (sum, participant) => sum + (participant.shares ?? 0),
          0,
        );

        if (totalShares <= 0) {
          throw new BadRequestException(
            'La suma de las partes debe ser mayor a cero',
          );
        }

        return participants.map((participant) =>
          this.roundTwo((amount * (participant.shares ?? 0)) / totalShares),
        );
      }

      default:
        throw new BadRequestException('Método de división no válido');
    }
  }

  private roundTwo(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
