import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Wallet } from './entities/wallet.entity';
import { WalletType } from './entities/wallet-type.entity';
import { WalletUser } from './entities/wallet-user.entity';
import { TransactionDetail } from '../transactions/entities/transaction-detail.entity';
import { User } from '../users/entities/user.entity';
import { CreateWalletDto, UpdateWalletDto } from './dto/wallet.dto';
import { CurrencyService } from './services/currency.service';
import { BalanceService } from './services/balance.service';

const ARCHIVED_STATE = 'ARCHIVED';

@Injectable()
export class WalletsService {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(WalletType)
    private readonly walletTypeRepository: Repository<WalletType>,
    @InjectRepository(WalletUser)
    private readonly walletUserRepository: Repository<WalletUser>,
    @InjectRepository(TransactionDetail)
    private readonly detailRepository: Repository<TransactionDetail>,
    private readonly currencyService: CurrencyService,
    private readonly balanceService: BalanceService,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateWalletDto, user: User) {
    const currency =
      dto.currencyWallet ?? this.currencyService.getDefaultCurrency(user);
    this.currencyService.validateCurrency(currency);

    const type = await this.findTypeByValue(dto.typeWallet);
    await this.assertUniqueName(dto.nameWallet, user.idUser);

    const wallet = this.walletRepository.create({
      nameWallet: dto.nameWallet,
      currencyWallet: currency,
      balanceWallet: 0,
      stateWallet: 'ACTIVE',
      descriptionWallet: dto.descriptionWallet ?? null,
      colorWallet: dto.colorWallet ?? null,
      iconWallet: dto.iconWallet ?? null,
      idTypeWallet: type,
    });

    const saved = await this.dataSource.transaction(async (manager) => {
      const savedWallet = await manager.save(Wallet, wallet);

      await manager.save(WalletUser, {
        roleInWallet: 'OWNER',
        users: { idUser: user.idUser },
        wallets: savedWallet,
      });

      return savedWallet;
    });

    return {
      data: saved,
      message: 'Billetera creada exitosamente',
    };
  }

  async findAll(idUser: string) {
    const walletUsers = await this.walletUserRepository.find({
      where: { users: { idUser } },
      relations: { wallets: true },
      order: { assignedAt: 'DESC' },
    });

    const wallets = walletUsers
      .map((wu) => wu.wallets)
      .filter((wallet) => wallet.stateWallet !== ARCHIVED_STATE);

    return {
      data: wallets,
      message: wallets.length
        ? undefined
        : 'No se encontraron billeteras para este usuario',
    };
  }

  async findOne(idWallet: string, idUser: string) {
    const wallet = await this.findOwnedWallet(idWallet, idUser);
    const balanceRealTime =
      await this.balanceService.getRealTimeBalance(idWallet);

    return {
      data: { ...wallet, balanceRealTime },
      message: undefined,
    };
  }

  async update(idWallet: string, dto: UpdateWalletDto, idUser: string) {
    const wallet = await this.findOwnedWallet(idWallet, idUser);

    if (dto.nameWallet && dto.nameWallet !== wallet.nameWallet) {
      await this.assertUniqueName(dto.nameWallet, idUser);
    }

    if (dto.currencyWallet && dto.currencyWallet !== wallet.currencyWallet) {
      this.currencyService.validateCurrency(dto.currencyWallet);
      await this.assertNoBalanceOrTransactions(wallet);
      wallet.currencyWallet = dto.currencyWallet;
    }

    if (dto.typeWallet) {
      const typeWalletValue: string = dto.typeWallet;
      if (typeWalletValue !== String(wallet.idTypeWallet.typeWallet)) {
        const type = await this.findTypeByValue(typeWalletValue);
        await this.assertNoBalanceOrTransactions(wallet);
        wallet.idTypeWallet = type;
      }
    }

    if (dto.nameWallet) {
      wallet.nameWallet = dto.nameWallet;
    }
    if (dto.descriptionWallet !== undefined) {
      wallet.descriptionWallet = dto.descriptionWallet;
    }
    if (dto.colorWallet !== undefined) {
      wallet.colorWallet = dto.colorWallet;
    }
    if (dto.iconWallet !== undefined) {
      wallet.iconWallet = dto.iconWallet;
    }

    await this.walletRepository.save(wallet);

    return {
      data: wallet,
      message: 'Billetera actualizada exitosamente',
    };
  }

  async remove(idWallet: string, idUser: string) {
    const wallet = await this.findOwnedWallet(idWallet, idUser);

    wallet.stateWallet = ARCHIVED_STATE;
    await this.walletRepository.save(wallet);

    return {
      data: wallet,
      message: 'Billetera archivada exitosamente',
    };
  }

  async getBalanceTotal(idUser: string) {
    const totals = await this.balanceService.getTotalByCurrency(idUser);

    return {
      data: totals,
      message: Object.keys(totals).length
        ? undefined
        : 'No se encontraron saldos para este usuario',
    };
  }

  private async findOwnedWallet(
    idWallet: string,
    idUser: string,
  ): Promise<Wallet> {
    const walletUser = await this.walletUserRepository.findOne({
      where: { users: { idUser }, wallets: { idWallet } },
      relations: { wallets: true },
    });

    if (!walletUser) {
      throw new NotFoundException('Billetera no encontrada');
    }

    if (walletUser.wallets.stateWallet === ARCHIVED_STATE) {
      throw new NotFoundException('Billetera no encontrada');
    }

    return walletUser.wallets;
  }

  private async findTypeByValue(typeWallet: string): Promise<WalletType> {
    const type = await this.walletTypeRepository.findOne({
      where: { typeWallet },
    });

    if (!type) {
      throw new BadRequestException(
        `El tipo de billetera '${typeWallet}' no está configurado en el sistema`,
      );
    }

    return type;
  }

  private async assertUniqueName(
    nameWallet: string,
    idUser: string,
  ): Promise<void> {
    const existing = await this.walletRepository
      .createQueryBuilder('wallet')
      .innerJoin(
        WalletUser,
        'userWallet',
        'userWallet.idWallet = wallet.idWallet',
      )
      .where('wallet.nameWallet = :nameWallet', { nameWallet })
      .andWhere('userWallet.idUser = :idUser', { idUser })
      .andWhere('wallet.stateWallet != :archived', {
        archived: ARCHIVED_STATE,
      })
      .getOne();

    if (existing) {
      throw new ConflictException(
        `Ya existe una billetera con el nombre '${nameWallet}'`,
      );
    }
  }

  private async assertNoBalanceOrTransactions(wallet: Wallet): Promise<void> {
    const balance = Number(wallet.balanceWallet);
    if (balance !== 0) {
      throw new BadRequestException(
        'La moneda o tipo de la billetera no se puede cambiar porque tiene saldo',
      );
    }

    const count = await this.detailRepository.count({
      where: { wallets: { idWallet: wallet.idWallet } },
    });

    if (count > 0) {
      throw new BadRequestException(
        'La moneda o tipo de la billetera no se puede cambiar porque tiene transacciones asociadas',
      );
    }
  }
}
