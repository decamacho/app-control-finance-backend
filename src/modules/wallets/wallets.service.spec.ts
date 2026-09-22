import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { WalletsService } from './wallets.service';
import { Wallet } from './entities/wallet.entity';
import { WalletType } from './entities/wallet-type.entity';
import { WalletUser } from './entities/wallet-user.entity';
import { TransactionDetail } from '../transactions/entities/transaction-detail.entity';
import { CurrencyService } from './services/currency.service';
import { BalanceService } from './services/balance.service';
import { WalletType as WalletTypeEnum } from './types/wallet-type.enum';

describe('WalletsService', () => {
  let service: WalletsService;
  let walletRepository: Record<string, jest.Mock>;
  let walletTypeRepository: Record<string, jest.Mock>;
  let walletUserRepository: Record<string, jest.Mock>;
  let detailRepository: Record<string, jest.Mock>;
  let currencyService: Record<string, jest.Mock>;
  let balanceService: Record<string, jest.Mock>;
  let dataSource: Record<string, jest.Mock>;
  let manager: Record<string, jest.Mock>;

  const user = {
    idUser: 'user-1',
    currencyDefault: 'COP',
  } as never;

  const walletType = {
    idTypeWallet: 'type-1',
    typeWallet: WalletTypeEnum.CASH,
    country: null,
    stateTypeWallet: 'ACTIVE',
  };

  const wallet = {
    idWallet: 'wallet-1',
    nameWallet: 'Efectivo',
    balanceWallet: 0,
    currencyWallet: 'COP',
    stateWallet: 'ACTIVE',
    descriptionWallet: null,
    colorWallet: null,
    iconWallet: null,
    idTypeWallet: walletType,
  };

  beforeEach(async () => {
    manager = {
      save: jest
        .fn()
        .mockImplementation((_entity: unknown, value: unknown) => value),
    };

    walletRepository = {
      create: jest.fn().mockImplementation((value: unknown) => value),
      save: jest.fn().mockImplementation((value: unknown) => value),
      update: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    walletTypeRepository = {
      findOne: jest.fn().mockResolvedValue(walletType),
    };
    walletUserRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
    };
    detailRepository = {
      count: jest.fn(),
    };
    currencyService = {
      validateCurrency: jest.fn(),
      getDefaultCurrency: jest.fn().mockReturnValue('COP'),
    };
    balanceService = {
      getTotalByCurrency: jest.fn(),
      getRealTimeBalance: jest.fn(),
    };
    dataSource = {
      transaction: jest
        .fn()
        .mockImplementation(
          async (cb: (manager: unknown) => Promise<unknown>) => cb(manager),
        ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletsService,
        { provide: getRepositoryToken(Wallet), useValue: walletRepository },
        {
          provide: getRepositoryToken(WalletType),
          useValue: walletTypeRepository,
        },
        {
          provide: getRepositoryToken(WalletUser),
          useValue: walletUserRepository,
        },
        {
          provide: getRepositoryToken(TransactionDetail),
          useValue: detailRepository,
        },
        { provide: CurrencyService, useValue: currencyService },
        { provide: BalanceService, useValue: balanceService },
        { provide: getDataSourceToken(), useValue: dataSource },
      ],
    }).compile();

    service = module.get<WalletsService>(WalletsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('crea una billetera y la asocia al usuario', async () => {
      const dto = {
        nameWallet: 'Efectivo',
        typeWallet: WalletTypeEnum.CASH,
        currencyWallet: 'COP',
      };

      walletRepository.createQueryBuilder.mockReturnValue({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      });

      const result = await service.create(dto, user);

      expect(currencyService.validateCurrency).toHaveBeenCalledWith('COP');
      expect(walletTypeRepository.findOne).toHaveBeenCalledWith({
        where: { typeWallet: WalletTypeEnum.CASH },
      });
      expect(manager.save).toHaveBeenCalled();
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('message', 'Billetera creada exitosamente');
    });

    it('usa la moneda por defecto del usuario cuando no se envía currencyWallet', async () => {
      const dto = {
        nameWallet: 'Ahorro',
        typeWallet: WalletTypeEnum.SAVINGS,
      };

      currencyService.getDefaultCurrency.mockReturnValue('USD');
      walletRepository.createQueryBuilder.mockReturnValue({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      });

      await service.create(dto, user);

      expect(currencyService.getDefaultCurrency).toHaveBeenCalledWith(user);
      expect(currencyService.validateCurrency).toHaveBeenCalledWith('USD');
      expect(walletRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ currencyWallet: 'USD' }),
      );
    });

    it('rechaza un tipo de billetera no configurado', async () => {
      walletTypeRepository.findOne.mockResolvedValue(null);

      const dto = {
        nameWallet: 'Cripto',
        typeWallet: WalletTypeEnum.CRYPTO,
      };

      await expect(service.create(dto, user)).rejects.toThrow(
        'no está configurado',
      );
    });

    it('rechaza un nombre duplicado para el mismo usuario', async () => {
      walletRepository.createQueryBuilder.mockReturnValue({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ ...wallet }),
      });

      const dto = {
        nameWallet: 'Efectivo',
        typeWallet: WalletTypeEnum.CASH,
      };

      await expect(service.create(dto, user)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findOne', () => {
    it('devuelve la billetera con balance en tiempo real', async () => {
      walletUserRepository.findOne.mockResolvedValue({ wallets: wallet });
      balanceService.getRealTimeBalance.mockResolvedValue(350);

      const result = await service.findOne('wallet-1', 'user-1');

      expect(walletUserRepository.findOne).toHaveBeenCalledWith({
        where: {
          users: { idUser: 'user-1' },
          wallets: { idWallet: 'wallet-1' },
        },
        relations: { wallets: true },
      });
      expect(balanceService.getRealTimeBalance).toHaveBeenCalledWith(
        'wallet-1',
      );
      expect(result.data).toEqual({ ...wallet, balanceRealTime: 350 });
    });

    it('lanza NotFoundException si no hay acceso', async () => {
      walletUserRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('wallet-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('actualiza campos editables de la billetera', async () => {
      walletUserRepository.findOne.mockResolvedValue({
        wallets: { ...wallet },
      });
      detailRepository.count.mockResolvedValue(0);

      const result = await service.update(
        'wallet-1',
        { colorWallet: '#FF5733', iconWallet: 'bank' },
        'user-1',
      );

      expect(walletRepository.save).toHaveBeenCalled();
      expect(result.data.colorWallet).toBe('#FF5733');
    });

    it('rechaza cambiar la moneda si tiene transacciones', async () => {
      walletUserRepository.findOne.mockResolvedValue({
        wallets: { ...wallet },
      });
      detailRepository.count.mockResolvedValue(5);

      await expect(
        service.update('wallet-1', { currencyWallet: 'USD' }, 'user-1'),
      ).rejects.toThrow('tiene transacciones asociadas');
    });

    it('rechaza cambiar la moneda si tiene saldo', async () => {
      walletUserRepository.findOne.mockResolvedValue({
        wallets: { ...wallet, balanceWallet: 100 },
      });

      await expect(
        service.update('wallet-1', { currencyWallet: 'USD' }, 'user-1'),
      ).rejects.toThrow('tiene saldo');
    });
  });

  describe('remove', () => {
    it('archiva la billetera (soft delete)', async () => {
      walletUserRepository.findOne.mockResolvedValue({
        wallets: { ...wallet },
      });

      const result = await service.remove('wallet-1', 'user-1');

      expect(walletRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ stateWallet: 'ARCHIVED' }),
      );
      expect(result.message).toBe('Billetera archivada exitosamente');
    });
  });

  describe('getBalanceTotal', () => {
    it('retorna los saldos agrupados por moneda', async () => {
      balanceService.getTotalByCurrency.mockResolvedValue({
        COP: 100,
        USD: 50,
      });

      const result = await service.getBalanceTotal('user-1');

      expect(balanceService.getTotalByCurrency).toHaveBeenCalledWith('user-1');
      expect(result.data).toEqual({ COP: 100, USD: 50 });
    });
  });
});
