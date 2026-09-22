import { Test, TestingModule } from '@nestjs/testing';
import { WalletsController } from './wallets.controller';
import { WalletsService } from './wallets.service';
import { WalletType } from './types/wallet-type.enum';

describe('WalletsController', () => {
  let controller: WalletsController;
  let walletsService: Record<string, jest.Mock>;

  const user = { idUser: 'user-1', currencyDefault: 'COP' } as never;

  beforeEach(async () => {
    walletsService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      getBalanceTotal: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WalletsController],
      providers: [{ provide: WalletsService, useValue: walletsService }],
    }).compile();

    controller = module.get<WalletsController>(WalletsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create delega al servicio con el usuario', async () => {
    const dto = {
      nameWallet: 'Efectivo',
      typeWallet: WalletType.CASH,
    };

    await controller.create(dto, user);

    expect(walletsService.create).toHaveBeenCalledWith(dto, user);
  });

  it('findAll delega con el id del usuario', async () => {
    await controller.findAll(user);

    expect(walletsService.findAll).toHaveBeenCalledWith('user-1');
  });

  it('findOne valida UUID y delega con el id del usuario', async () => {
    await controller.findOne('wallet-1', user);

    expect(walletsService.findOne).toHaveBeenCalledWith('wallet-1', 'user-1');
  });

  it('update delega con id, dto y usuario', async () => {
    const dto = { colorWallet: '#FF5733' };

    await controller.update('wallet-1', dto, user);

    expect(walletsService.update).toHaveBeenCalledWith(
      'wallet-1',
      dto,
      'user-1',
    );
  });

  it('remove delega con id y usuario', async () => {
    await controller.remove('wallet-1', user);

    expect(walletsService.remove).toHaveBeenCalledWith('wallet-1', 'user-1');
  });

  it('getBalanceTotal delega con el id del usuario', async () => {
    await controller.getBalanceTotal(user);

    expect(walletsService.getBalanceTotal).toHaveBeenCalledWith('user-1');
  });
});
