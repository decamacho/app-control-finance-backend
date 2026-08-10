import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { TransactionsService } from './transactions.service';
import { Transaction } from '../entities/transaction.entity';
import { TransactionDetail } from '../entities/transaction-detail.entity';
import { TransactionCategory } from '../entities/transaction-category.entity';
import { Wallet } from '../../wallets/entities/wallet.entity';
import { savingGoal } from '../../goals/entities/goal.entity';
import { TransactionSplitUser } from '../../splits/entities/split.entity';
import { TransactionValidatorService } from './transaction-validator.service';
import { ValidTransactionTypes } from '../types/transactios-type.enum';
import { CreateTransactionDto } from '../dto/transaction.dto';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let validator: Record<string, jest.Mock>;
  let transactionRepository: Record<string, jest.Mock>;
  let detailRepository: Record<string, jest.Mock>;
  let categoryRepository: Record<string, jest.Mock>;
  let goalRepository: Record<string, jest.Mock>;
  let dataSource: Record<string, jest.Mock>;
  let manager: Record<string, jest.Mock>;
  let walletRepository: Record<string, jest.Mock>;

  const wallet = {
    idWallet: 'wallet-1',
    currencyWallet: 'COP',
    balanceWallet: 500,
    stateWallet: 'ACTIVE',
  };

  const expenseType = {
    idTypeTransaction: 'type-1',
    typeTransaction: ValidTransactionTypes.EXPENSE,
    stateTypeTransaction: true,
  };

  const buildManager = () => {
    walletRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };
    manager = {
      getRepository: jest.fn(),
      save: jest
        .fn()
        .mockImplementation((_entity: unknown, value: unknown) => value),
      update: jest.fn(),
    };
    manager.getRepository.mockImplementation((entity: unknown) => {
      if (entity === Wallet) return walletRepository;
      return { findOne: jest.fn() };
    });
  };

  beforeEach(async () => {
    buildManager();

    validator = {
      validateAmount: jest.fn(),
      validateWalletForUser: jest.fn(),
      validateCurrency: jest.fn(),
      validateTransactionType: jest.fn(),
      validateCategory: jest.fn(),
      validateBalance: jest.fn(),
      getSign: jest.fn(),
    };

    transactionRepository = { findOne: jest.fn(), create: jest.fn() };
    detailRepository = { create: jest.fn() };
    categoryRepository = { create: jest.fn() };
    goalRepository = { findOne: jest.fn() };
    dataSource = {
      transaction: jest
        .fn()
        .mockImplementation(
          async (cb: (manager: unknown) => Promise<unknown>) => cb(manager),
        ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        {
          provide: TransactionValidatorService,
          useValue: validator,
        },
        {
          provide: getRepositoryToken(Transaction),
          useValue: transactionRepository,
        },
        {
          provide: getRepositoryToken(TransactionDetail),
          useValue: detailRepository,
        },
        {
          provide: getRepositoryToken(TransactionCategory),
          useValue: categoryRepository,
        },
        {
          provide: getRepositoryToken(Wallet),
          useValue: { findOne: jest.fn(), save: jest.fn() },
        },
        {
          provide: getRepositoryToken(savingGoal),
          useValue: goalRepository,
        },
        {
          provide: getRepositoryToken(TransactionSplitUser),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getDataSourceToken(),
          useValue: dataSource,
        },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('crea una transacción de gasto y descuenta el saldo', async () => {
      const dto: CreateTransactionDto = {
        amount: 100,
        idWallet: 'wallet-1',
        idTypeTransaction: 'type-1',
      };

      validator.validateWalletForUser.mockResolvedValue(wallet);
      validator.validateTransactionType.mockResolvedValue(expenseType);
      validator.getSign.mockReturnValue(-1);
      walletRepository.findOne.mockResolvedValue({ ...wallet });
      transactionRepository.create.mockImplementation(
        (value: unknown) => value,
      );
      detailRepository.create.mockImplementation((value: unknown) => value);

      const result = await service.create(dto, 'user-1');

      expect(validator.validateWalletForUser).toHaveBeenCalledWith(
        'wallet-1',
        'user-1',
      );
      expect(validator.validateBalance).toHaveBeenCalledWith(wallet, 100);
      expect(result.message).toBe('Transacción creada exitosamente');
      expect(result.data.amount).toBe(100);
      expect(walletRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ balanceWallet: 400 }),
      );
    });

    it('rechaza una transacción con tipo TRANSFER', async () => {
      validator.validateWalletForUser.mockResolvedValue(wallet);
      validator.validateTransactionType.mockResolvedValue({
        ...expenseType,
        typeTransaction: ValidTransactionTypes.TRANSFER,
      });

      await expect(
        service.create(
          { amount: 100, idWallet: 'wallet-1', idTypeTransaction: 'type-1' },
          'user-1',
        ),
      ).rejects.toThrow('Las transferencias deben usar el endpoint');
    });
  });

  describe('refund', () => {
    it('rechaza cuando ya existe un reembolso para la transacción', async () => {
      transactionRepository.findOne
        .mockResolvedValueOnce({
          idTransaction: 'tx-1',
          amount: '100',
          idParentTransaction: null,
          description: 'Compra',
          typeTransaction: { typeTransaction: ValidTransactionTypes.EXPENSE },
          details: [{ wallets: { ...wallet } }],
        })
        .mockResolvedValueOnce({ idTransaction: 'refund-1' });

      validator.validateWalletForUser.mockResolvedValue(wallet);
      validator.getSign.mockReturnValue(-1);

      await expect(service.refund('tx-1', {}, 'user-1')).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('lanza NotFound cuando la transacción no existe', async () => {
      transactionRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.refund('tx-1', {}, 'user-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('cancel', () => {
    it('lanza NotFound cuando la transacción no existe', async () => {
      transactionRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.cancel('tx-1', 'user-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
