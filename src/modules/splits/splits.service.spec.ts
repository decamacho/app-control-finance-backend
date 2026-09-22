import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { SplitsService } from './splits.service';
import { Transaction } from '../transactions/entities/transaction.entity';
import { TransactionDetail } from '../transactions/entities/transaction-detail.entity';
import { TransactionSplitUser, SplitMethod } from './entities/split.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { User } from '../users/entities/user.entity';
import { TransactionCategory } from '../transactions/entities/transaction-category.entity';
import { TransactionValidatorService } from '../transactions/services/transaction-validator.service';
import { ValidTransactionTypes } from '../transactions/types/transactios-type.enum';
import { SplitTransactionDto } from '../transactions/dto/transaction.dto';

describe('SplitsService', () => {
  let service: SplitsService;
  let validator: Record<string, jest.Mock>;
  let transactionRepository: Record<string, jest.Mock>;
  let detailRepository: Record<string, jest.Mock>;
  let splitRepository: Record<string, jest.Mock>;
  let dataSource: Record<string, jest.Mock>;
  let manager: Record<string, jest.Mock>;
  let walletRepository: Record<string, jest.Mock>;
  let createdSplits: Array<Record<string, unknown>>;

  const wallet = {
    idWallet: 'wallet-1',
    currencyWallet: 'COP',
    balanceWallet: 1000,
    stateWallet: 'ACTIVE',
  };

  const expenseType = {
    idTypeTransaction: 'type-1',
    typeTransaction: ValidTransactionTypes.EXPENSE,
    stateTypeTransaction: true,
  };

  beforeEach(async () => {
    walletRepository = { findOne: jest.fn(), save: jest.fn() };
    createdSplits = [];
    manager = {
      getRepository: jest.fn(),
      save: jest
        .fn()
        .mockImplementation((_entity: unknown, value: unknown) => value),
    };
    manager.getRepository.mockImplementation((entity: unknown) => {
      if (entity === Wallet) return walletRepository;
      return { findOne: jest.fn() };
    });

    validator = {
      validateAmount: jest.fn(),
      validateWalletForUser: jest.fn(),
      validateCurrency: jest.fn(),
      validateTransactionType: jest.fn(),
      validateCategory: jest.fn(),
      validateBalance: jest.fn(),
      getSign: jest.fn(),
    };

    transactionRepository = { create: jest.fn() };
    detailRepository = { create: jest.fn() };
    splitRepository = {
      create: jest.fn().mockImplementation((value: Record<string, unknown>) => {
        createdSplits.push(value);
        return { ...value, idSplit: `split-${createdSplits.length}` };
      }),
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
        SplitsService,
        { provide: TransactionValidatorService, useValue: validator },
        {
          provide: getRepositoryToken(Transaction),
          useValue: transactionRepository,
        },
        {
          provide: getRepositoryToken(TransactionDetail),
          useValue: detailRepository,
        },
        {
          provide: getRepositoryToken(TransactionSplitUser),
          useValue: splitRepository,
        },
        { provide: getRepositoryToken(Wallet), useValue: walletRepository },
        { provide: getRepositoryToken(User), useValue: { findOne: jest.fn() } },
        {
          provide: getRepositoryToken(TransactionCategory),
          useValue: { create: jest.fn((value: unknown) => value) },
        },
        { provide: getDataSourceToken(), useValue: dataSource },
      ],
    }).compile();

    service = module.get<SplitsService>(SplitsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('divide EQUAL el monto entre los participantes', async () => {
    const dto: SplitTransactionDto = {
      amount: 100,
      idWallet: 'wallet-1',
      idTypeTransaction: 'type-1',
      splitMethod: SplitMethod.EQUAL,
      participants: [
        { friendName: 'Ana' },
        { friendName: 'Luis' },
        { friendName: 'Pablo' },
      ],
    };

    validator.validateWalletForUser.mockResolvedValue(wallet);
    validator.validateTransactionType.mockResolvedValue(expenseType);
    validator.getSign.mockReturnValue(-1);
    walletRepository.findOne.mockResolvedValue({ ...wallet });
    transactionRepository.create.mockImplementation((value: unknown) => value);
    detailRepository.create.mockImplementation((value: unknown) => value);

    const result = await service.createSplitTransaction(dto, 'user-1');

    expect(result.message).toBe('Transacción dividida exitosamente');
    expect(createdSplits.map((split) => split.amountSplit)).toEqual([
      33.34, 33.33, 33.33,
    ]);
    expect(createdSplits[0].splitMethod).toBe(SplitMethod.EQUAL);
  });

  it('rechaza porcentajes que no suman 100', async () => {
    const dto: SplitTransactionDto = {
      amount: 100,
      idWallet: 'wallet-1',
      idTypeTransaction: 'type-1',
      splitMethod: SplitMethod.PERCENTAGE,
      participants: [
        { friendName: 'Ana', percentage: 50 },
        { friendName: 'Luis', percentage: 30 },
      ],
    };

    validator.validateWalletForUser.mockResolvedValue(wallet);
    validator.validateTransactionType.mockResolvedValue(expenseType);
    validator.getSign.mockReturnValue(-1);

    await expect(service.createSplitTransaction(dto, 'user-1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('divide SHARES proporcional a las partes', async () => {
    const dto: SplitTransactionDto = {
      amount: 300,
      idWallet: 'wallet-1',
      idTypeTransaction: 'type-1',
      splitMethod: SplitMethod.SHARES,
      participants: [
        { friendName: 'Ana', shares: 1 },
        { friendName: 'Luis', shares: 2 },
      ],
    };

    validator.validateWalletForUser.mockResolvedValue(wallet);
    validator.validateTransactionType.mockResolvedValue(expenseType);
    validator.getSign.mockReturnValue(-1);
    walletRepository.findOne.mockResolvedValue({ ...wallet });
    transactionRepository.create.mockImplementation((value: unknown) => value);
    detailRepository.create.mockImplementation((value: unknown) => value);

    const result = await service.createSplitTransaction(dto, 'user-1');

    expect(result.data.splits).toHaveLength(2);
    expect(createdSplits.map((split) => split.amountSplit)).toEqual([100, 200]);
  });
});
