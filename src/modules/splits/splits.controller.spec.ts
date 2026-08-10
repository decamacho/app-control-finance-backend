import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { SplitsController } from './splits.controller';
import { SplitsService } from './splits.service';
import { Transaction } from '../transactions/entities/transaction.entity';
import { TransactionDetail } from '../transactions/entities/transaction-detail.entity';
import { TransactionSplitUser } from './entities/split.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { User } from '../users/entities/user.entity';
import { TransactionCategory } from '../transactions/entities/transaction-category.entity';
import { TransactionValidatorService } from '../transactions/services/transaction-validator.service';

describe('SplitsController', () => {
  let controller: SplitsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SplitsController],
      providers: [
        SplitsService,
        { provide: TransactionValidatorService, useValue: {} },
        { provide: getRepositoryToken(Transaction), useValue: {} },
        { provide: getRepositoryToken(TransactionDetail), useValue: {} },
        { provide: getRepositoryToken(TransactionSplitUser), useValue: {} },
        { provide: getRepositoryToken(Wallet), useValue: {} },
        { provide: getRepositoryToken(User), useValue: {} },
        { provide: getRepositoryToken(TransactionCategory), useValue: {} },
        { provide: getDataSourceToken(), useValue: { transaction: jest.fn() } },
      ],
    }).compile();

    controller = module.get<SplitsController>(SplitsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
