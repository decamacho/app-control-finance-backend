import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BalanceService } from './balance.service';
import { Wallet } from '../entities/wallet.entity';
import { WalletUser } from '../entities/wallet-user.entity';
import { TransactionDetail } from '../../transactions/entities/transaction-detail.entity';

describe('BalanceService', () => {
  let service: BalanceService;
  let walletRepository: Record<string, jest.Mock>;
  let walletUserRepository: Record<string, jest.Mock>;
  let detailRepository: Record<string, jest.Mock>;

  beforeEach(async () => {
    walletRepository = {
      createQueryBuilder: jest.fn(),
    };
    walletUserRepository = {
      find: jest.fn(),
    };
    detailRepository = {
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BalanceService,
        { provide: getRepositoryToken(Wallet), useValue: walletRepository },
        {
          provide: getRepositoryToken(WalletUser),
          useValue: walletUserRepository,
        },
        {
          provide: getRepositoryToken(TransactionDetail),
          useValue: detailRepository,
        },
      ],
    }).compile();

    service = module.get<BalanceService>(BalanceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getTotalByCurrency', () => {
    it('agrupa los saldos por moneda', async () => {
      walletUserRepository.find.mockResolvedValue([
        { wallets: { idWallet: 'wallet-1' } },
        { wallets: { idWallet: 'wallet-2' } },
      ]);

      const qb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { currency: 'COP', total: '100' },
          { currency: 'USD', total: '50' },
        ]),
      };
      walletRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getTotalByCurrency('user-1');

      expect(result).toEqual({ COP: 100, USD: 50 });
    });

    it('retorna vacio si el usuario no tiene billeteras', async () => {
      walletUserRepository.find.mockResolvedValue([]);

      const result = await service.getTotalByCurrency('user-1');

      expect(result).toEqual({});
    });
  });

  describe('getRealTimeBalance', () => {
    it('suma los amountPaid de los detalles activos', async () => {
      const qb = {
        select: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '350' }),
      };
      detailRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getRealTimeBalance('wallet-1');

      expect(result).toBe(350);
    });
  });
});
