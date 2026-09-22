import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TransactionValidatorService } from './transaction-validator.service';
import { Wallet } from '../../wallets/entities/wallet.entity';
import { WalletUser } from '../../wallets/entities/wallet-user.entity';
import { TransactionType } from '../entities/transaction-type.entity';
import { Category } from '../../categories/entities/category.entity';
import { ValidTransactionTypes } from '../types/transactios-type.enum';

describe('TransactionValidatorService', () => {
  let service: TransactionValidatorService;
  let walletRepository: Record<string, jest.Mock>;
  let walletUserRepository: Record<string, jest.Mock>;
  let typeRepository: Record<string, jest.Mock>;
  let categoryRepository: Record<string, jest.Mock>;

  beforeEach(async () => {
    walletRepository = { findOne: jest.fn() };
    walletUserRepository = { findOne: jest.fn() };
    typeRepository = { findOne: jest.fn() };
    categoryRepository = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionValidatorService,
        { provide: getRepositoryToken(Wallet), useValue: walletRepository },
        {
          provide: getRepositoryToken(WalletUser),
          useValue: walletUserRepository,
        },
        {
          provide: getRepositoryToken(TransactionType),
          useValue: typeRepository,
        },
        { provide: getRepositoryToken(Category), useValue: categoryRepository },
      ],
    }).compile();

    service = module.get<TransactionValidatorService>(
      TransactionValidatorService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSign', () => {
    it('INCOME es positivo', () => {
      expect(service.getSign(ValidTransactionTypes.INCOME)).toBe(1);
    });

    it('TRANSFER es neutro', () => {
      expect(service.getSign(ValidTransactionTypes.TRANSFER)).toBe(0);
    });

    it('EXPENSE y PAYMENT son negativos', () => {
      expect(service.getSign(ValidTransactionTypes.EXPENSE)).toBe(-1);
      expect(service.getSign(ValidTransactionTypes.PAYMENT)).toBe(-1);
    });
  });

  describe('validateAmount', () => {
    it('rechaza montos no positivos', () => {
      expect(() => service.validateAmount(0)).toThrow(BadRequestException);
      expect(() => service.validateAmount(-5)).toThrow(BadRequestException);
    });

    it('acepta montos positivos', () => {
      expect(() => service.validateAmount(100)).not.toThrow();
    });
  });

  describe('validateBalance', () => {
    it('rechaza saldo insuficiente', () => {
      const wallet = { balanceWallet: '10' } as Wallet;
      expect(() => service.validateBalance(wallet, 20)).toThrow(
        BadRequestException,
      );
    });
  });

  describe('validateCurrency', () => {
    it('rechaza moneda incompatible', () => {
      const wallet = { currencyWallet: 'COP' } as Wallet;
      expect(() => service.validateCurrency(wallet, 'USD')).toThrow(
        BadRequestException,
      );
    });

    it('usa COP por defecto', () => {
      const wallet = { currencyWallet: 'COP' } as Wallet;
      expect(() => service.validateCurrency(wallet)).not.toThrow();
    });
  });

  describe('validateWalletForUser', () => {
    it('lanza NotFound si la billetera no existe', async () => {
      walletRepository.findOne.mockResolvedValueOnce(null);
      await expect(
        service.validateWalletForUser('wallet-1', 'user-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rechaza cuando el usuario no tiene acceso', async () => {
      walletRepository.findOne.mockResolvedValueOnce({ idWallet: 'wallet-1' });
      walletUserRepository.findOne.mockResolvedValueOnce(null);
      await expect(
        service.validateWalletForUser('wallet-1', 'user-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
