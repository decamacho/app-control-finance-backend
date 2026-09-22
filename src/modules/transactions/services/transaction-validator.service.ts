import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from '../../wallets/entities/wallet.entity';
import { WalletUser } from '../../wallets/entities/wallet-user.entity';
import { TransactionType } from '../entities/transaction-type.entity';
import {
  Category,
  CategoryType,
} from '../../categories/entities/category.entity';
import { ValidTransactionTypes } from '../types/transactios-type.enum';

export type TransactionSign = 1 | -1 | 0;

const DEFAULT_CURRENCY = 'COP';

@Injectable()
export class TransactionValidatorService {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(WalletUser)
    private readonly walletUserRepository: Repository<WalletUser>,
    @InjectRepository(TransactionType)
    private readonly typeRepository: Repository<TransactionType>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  getSign(type: ValidTransactionTypes): TransactionSign {
    if (type === ValidTransactionTypes.INCOME) {
      return 1;
    }

    if (type === ValidTransactionTypes.TRANSFER) {
      return 0;
    }

    return -1;
  }

  validateAmount(amount: number): void {
    if (!amount || amount <= 0) {
      throw new BadRequestException('El monto debe ser mayor a cero');
    }
  }

  validateBalance(wallet: Wallet, amount: number): void {
    if (Number(wallet.balanceWallet) < amount) {
      throw new BadRequestException('Saldo insuficiente en la billetera');
    }
  }

  validateCurrency(wallet: Wallet, currency?: string): void {
    const currencyToUse = currency ?? DEFAULT_CURRENCY;
    if (wallet.currencyWallet !== currencyToUse) {
      throw new BadRequestException(
        `La moneda ${currencyToUse} no es compatible con la billetera`,
      );
    }
  }

  async validateWalletForUser(
    idWallet: string,
    idUser: string,
  ): Promise<Wallet> {
    const wallet = await this.walletRepository.findOne({
      where: { idWallet },
    });

    if (!wallet) {
      throw new NotFoundException('Billetera no encontrada');
    }

    if (wallet.stateWallet !== 'ACTIVE') {
      throw new BadRequestException('La billetera se encuentra inactiva');
    }

    const userWallet = await this.walletUserRepository.findOne({
      where: { users: { idUser }, wallets: { idWallet } },
    });

    if (!userWallet) {
      throw new BadRequestException(
        'El usuario no tiene acceso a esta billetera',
      );
    }

    return wallet;
  }

  async validateTransactionType(
    idTypeTransaction: string,
  ): Promise<TransactionType> {
    const type = await this.typeRepository.findOne({
      where: { idTypeTransaction },
    });

    if (!type) {
      throw new NotFoundException('Tipo de transacción no encontrado');
    }

    if (!type.stateTypeTransaction) {
      throw new BadRequestException(
        'El tipo de transacción se encuentra inactivo',
      );
    }

    return type;
  }

  async validateCategory(
    idCategory: string,
    sign: TransactionSign,
  ): Promise<Category> {
    const category = await this.categoryRepository.findOne({
      where: { idCategory },
    });

    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }

    const expectedType = sign > 0 ? CategoryType.INCOME : CategoryType.EXPENSE;

    if (category.typeCategory !== expectedType) {
      throw new BadRequestException(
        `La categoría debe ser de tipo ${expectedType}`,
      );
    }

    return category;
  }
}
