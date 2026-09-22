import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TransactionHistoryService } from './transaction-history.service';
import { Transaction } from '../entities/transaction.entity';
import { ValidTransactionTypes } from '../types/transactios-type.enum';

describe('TransactionHistoryService', () => {
  let service: TransactionHistoryService;
  let queryBuilder: Record<string, jest.Mock>;

  const transaction = {
    idTransaction: 'tx-1',
    amount: '100',
    currencyTransaction: 'COP',
    description: 'Compra',
    transactionDate: new Date(),
    stateTransaction: 'ACTIVE',
    isRecurring: false,
    recurrencePattern: null,
    idParentTransaction: null,
    typeTransaction: { typeTransaction: ValidTransactionTypes.EXPENSE },
    details: [{ wallets: { idWallet: 'wallet-1', nameWallet: 'Efectivo' } }],
    transactionCategories: [
      { categories: { idCategory: 'cat-1', nameCategory: 'Comida' } },
    ],
  };

  const buildQueryBuilder = () => {
    queryBuilder = {
      leftJoin: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      distinct: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    };
  };

  beforeEach(async () => {
    buildQueryBuilder();

    const transactionRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionHistoryService,
        {
          provide: getRepositoryToken(Transaction),
          useValue: transactionRepository,
        },
      ],
    }).compile();

    service = module.get<TransactionHistoryService>(TransactionHistoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('obtiene el historial con filtros y paginación', async () => {
    queryBuilder.getManyAndCount.mockResolvedValue([[transaction], 1]);

    const result = await service.findHistory(
      {
        typeTransaction: ValidTransactionTypes.EXPENSE,
        page: 1,
        limit: 20,
      },
      'user-1',
    );

    expect(result.data.total).toBe(1);
    expect(result.data.items[0].amount).toBe(100);
    expect(result.data.items[0].wallet).toEqual({
      idWallet: 'wallet-1',
      nameWallet: 'Efectivo',
    });
    expect(result.data.items[0].category).toEqual({
      idCategory: 'cat-1',
      nameCategory: 'Comida',
    });
    expect(queryBuilder.innerJoin).toHaveBeenCalledWith(
      'wallet.wallets',
      'userWallet',
      'userWallet.idUser = :idUser',
      { idUser: 'user-1' },
    );
    expect(queryBuilder.addSelect).toHaveBeenCalledWith(
      expect.arrayContaining([
        'detail.idDetail',
        'txCategory.idTransactionCategory',
      ]),
    );
  });

  it('obtiene transacciones pendientes', async () => {
    queryBuilder.getManyAndCount.mockResolvedValue([[transaction], 1]);

    const result = await service.findPending({}, 'user-1');

    expect(result.data.total).toBe(1);
    expect(result.message).toBe(
      'Transacciones pendientes obtenidas exitosamente',
    );
  });
});
