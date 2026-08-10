import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { TransferService } from './transfer.service';
import { Transaction } from '../entities/transaction.entity';
import { TransactionDetail } from '../entities/transaction-detail.entity';
import { TransactionType } from '../entities/transaction-type.entity';
import { Wallet } from '../../wallets/entities/wallet.entity';
import { TransactionValidatorService } from './transaction-validator.service';
import { ValidTransactionTypes } from '../types/transactios-type.enum';
import { TransferDto } from '../dto/transaction.dto';

describe('TransferService', () => {
  let service: TransferService;
  let validator: Record<string, jest.Mock>;
  let transactionRepository: Record<string, jest.Mock>;
  let detailRepository: Record<string, jest.Mock>;
  let dataSource: Record<string, jest.Mock>;
  let manager: Record<string, jest.Mock>;
  let walletRepository: Record<string, jest.Mock>;
  let typeRepository: Record<string, jest.Mock>;

  const source = {
    idWallet: 'source-1',
    currencyWallet: 'COP',
    balanceWallet: 500,
    stateWallet: 'ACTIVE',
  };
  const destination = {
    idWallet: 'dest-1',
    currencyWallet: 'COP',
    balanceWallet: 200,
    stateWallet: 'ACTIVE',
  };

  const buildManager = () => {
    walletRepository = { findOne: jest.fn(), save: jest.fn() };
    typeRepository = { findOne: jest.fn() };
    manager = {
      getRepository: jest.fn(),
      save: jest
        .fn()
        .mockImplementation((_entity: unknown, value: unknown) => value),
    };
    manager.getRepository.mockImplementation((entity: unknown) => {
      if (entity === Wallet) return walletRepository;
      if (entity === TransactionType) return typeRepository;
      return { findOne: jest.fn() };
    });
  };

  beforeEach(async () => {
    buildManager();

    validator = {
      validateAmount: jest.fn(),
      validateWalletForUser: jest.fn(),
      validateBalance: jest.fn(),
    };

    transactionRepository = { create: jest.fn() };
    detailRepository = { create: jest.fn() };
    dataSource = {
      transaction: jest
        .fn()
        .mockImplementation(
          async (cb: (manager: unknown) => Promise<unknown>) => cb(manager),
        ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransferService,
        { provide: TransactionValidatorService, useValue: validator },
        {
          provide: getRepositoryToken(Transaction),
          useValue: transactionRepository,
        },
        {
          provide: getRepositoryToken(TransactionDetail),
          useValue: detailRepository,
        },
        { provide: getDataSourceToken(), useValue: dataSource },
      ],
    }).compile();

    service = module.get<TransferService>(TransferService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('transfiere el monto entre billeteras y actualiza los saldos', async () => {
    const dto: TransferDto = {
      idSourceWallet: 'source-1',
      idDestinationWallet: 'dest-1',
      amount: 150,
    };

    validator.validateWalletForUser
      .mockResolvedValueOnce(source)
      .mockResolvedValueOnce(destination);
    walletRepository.findOne
      .mockResolvedValueOnce({ ...source })
      .mockResolvedValueOnce({ ...destination });
    typeRepository.findOne.mockResolvedValue({
      idTypeTransaction: 'type-transfer',
      typeTransaction: ValidTransactionTypes.TRANSFER,
    });
    transactionRepository.create.mockImplementation((value: unknown) => value);
    detailRepository.create.mockImplementation((value: unknown) => value);

    const result = await service.transfer(dto, 'user-1');

    expect(result.message).toBe('Transferencia realizada exitosamente');
    expect(result.data.source.amount).toBe(150);
    expect(result.data.destination.amount).toBe(150);
    expect(walletRepository.save).toHaveBeenCalledWith([
      expect.objectContaining({ balanceWallet: 350 }),
      expect.objectContaining({ balanceWallet: 350 }),
    ]);
  });

  it('rechaza transferencias a la misma billetera', async () => {
    validator.validateWalletForUser
      .mockResolvedValueOnce(source)
      .mockResolvedValueOnce(source);

    await expect(
      service.transfer(
        {
          idSourceWallet: 'source-1',
          idDestinationWallet: 'source-1',
          amount: 10,
        },
        'user-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza transferencias con monedas distintas', async () => {
    validator.validateWalletForUser
      .mockResolvedValueOnce(source)
      .mockResolvedValueOnce({ ...destination, currencyWallet: 'USD' });

    await expect(
      service.transfer(
        {
          idSourceWallet: 'source-1',
          idDestinationWallet: 'dest-1',
          amount: 10,
        },
        'user-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
