import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Transaction } from '../entities/transaction.entity';
import { TransactionDetail } from '../entities/transaction-detail.entity';
import { TransactionType } from '../entities/transaction-type.entity';
import { Wallet } from '../../wallets/entities/wallet.entity';
import { ValidTransactionTypes } from '../types/transactios-type.enum';
import { TransferDto } from '../dto/transaction.dto';
import { TransactionValidatorService } from './transaction-validator.service';
import { serializeTransaction } from './transaction.serializer';

@Injectable()
export class TransferService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(TransactionDetail)
    private readonly detailRepository: Repository<TransactionDetail>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly validator: TransactionValidatorService,
  ) {}

  async transfer(dto: TransferDto, idUser: string) {
    this.validator.validateAmount(dto.amount);
    const source = await this.validator.validateWalletForUser(
      dto.idSourceWallet,
      idUser,
    );
    const destination = await this.validator.validateWalletForUser(
      dto.idDestinationWallet,
      idUser,
    );

    if (source.idWallet === destination.idWallet) {
      throw new BadRequestException(
        'La billetera origen y destino no pueden ser la misma',
      );
    }

    const currency = dto.currency ?? source.currencyWallet;
    if (
      source.currencyWallet !== currency ||
      destination.currencyWallet !== currency
    ) {
      throw new BadRequestException(
        'Las billeteras deben tener la misma moneda',
      );
    }

    this.validator.validateBalance(source, dto.amount);

    const result = await this.dataSource.transaction(async (manager) => {
      const walletRepository = manager.getRepository(Wallet);
      const sourceLocked = await walletRepository.findOne({
        where: { idWallet: source.idWallet },
      });
      const destinationLocked = await walletRepository.findOne({
        where: { idWallet: destination.idWallet },
      });

      if (!sourceLocked || !destinationLocked) {
        throw new NotFoundException('Billetera no encontrada');
      }

      if (Number(sourceLocked.balanceWallet) < dto.amount) {
        throw new BadRequestException(
          'Saldo insuficiente para realizar la transferencia',
        );
      }

      const typeRepository = manager.getRepository(TransactionType);
      const transferType = await typeRepository.findOne({
        where: { typeTransaction: ValidTransactionTypes.TRANSFER },
      });

      if (!transferType) {
        throw new NotFoundException(
          'El tipo de transacción TRANSFER no está configurado',
        );
      }

      const description = dto.description ?? 'Transferencia entre billeteras';
      const sourceTransaction = this.transactionRepository.create({
        amount: dto.amount,
        description,
        currencyTransaction: currency,
        transactionDate: dto.transactionDate ?? new Date(),
        typeTransaction: transferType,
        details: [
          this.detailRepository.create({
            amountPaid: -dto.amount,
            wallets: sourceLocked,
          }),
        ],
      });

      const savedSource = await manager.save(Transaction, sourceTransaction);

      const destinationTransaction = this.transactionRepository.create({
        amount: dto.amount,
        description,
        currencyTransaction: currency,
        transactionDate: dto.transactionDate ?? new Date(),
        typeTransaction: transferType,
        idParentTransaction: savedSource.idTransaction,
        details: [
          this.detailRepository.create({
            amountPaid: dto.amount,
            wallets: destinationLocked,
          }),
        ],
      });

      const savedDestination = await manager.save(
        Transaction,
        destinationTransaction,
      );

      sourceLocked.balanceWallet =
        Number(sourceLocked.balanceWallet) - dto.amount;
      destinationLocked.balanceWallet =
        Number(destinationLocked.balanceWallet) + dto.amount;
      await walletRepository.save([sourceLocked, destinationLocked]);

      return { source: savedSource, destination: savedDestination };
    });

    return {
      data: {
        source: serializeTransaction(result.source),
        destination: serializeTransaction(result.destination),
      },
      message: 'Transferencia realizada exitosamente',
    };
  }
}
