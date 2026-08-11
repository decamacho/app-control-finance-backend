import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CustomersService } from './customers.service';
import { BusinessValidatorService } from './business-validator.service';
import { BusinessCustomer } from '../entities/business-customer.entity';
import { BusinessType } from '../entities/business.entity';

describe('CustomersService', () => {
  let service: CustomersService;
  let customerRepository: Record<string, jest.Mock>;
  let validator: Record<string, jest.Mock>;

  beforeEach(async () => {
    customerRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn().mockImplementation((value: unknown) => value),
      save: jest.fn().mockImplementation((value: { idCustomer?: string }) => ({
        ...value,
        idCustomer: value.idCustomer ?? 'customer-1',
      })),
      remove: jest.fn(),
    };
    validator = {
      assertBusinessOwnership: jest.fn().mockResolvedValue({
        idBusiness: 'business-1',
        businessType: BusinessType.FOOD_SALE,
      }),
      assertBusinessType: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        {
          provide: getRepositoryToken(BusinessCustomer),
          useValue: customerRepository,
        },
        { provide: BusinessValidatorService, useValue: validator },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('lista clientes del negocio y valida businessType FOOD_SALE', async () => {
      customerRepository.find.mockResolvedValue([
        { idCustomer: 'customer-1', nameCustomer: 'Ana' },
      ]);

      const result = await service.findAll('business-1', 'user-1');

      expect(customerRepository.find).toHaveBeenCalledWith({
        where: { business: { idBusiness: 'business-1' } },
        order: { nameCustomer: 'ASC' },
      });
      expect(validator.assertBusinessType).toHaveBeenCalledWith(
        expect.objectContaining({ businessType: BusinessType.FOOD_SALE }),
        BusinessType.FOOD_SALE,
      );
      expect(result.data).toHaveLength(1);
    });
  });

  describe('create', () => {
    it('crea el cliente con datos normalizados', async () => {
      const result = await service.create(
        'business-1',
        {
          nameCustomer: '  Ana  ',
          locationCustomer: ' Esquina 12 ',
          phoneCustomer: '3001234567',
        },
        'user-1',
      );

      expect(customerRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          nameCustomer: 'Ana',
          locationCustomer: 'Esquina 12',
          phoneCustomer: '3001234567',
          business: { idBusiness: 'business-1' },
        }),
      );
      expect(result.message).toBe('Cliente creado exitosamente');
    });
  });

  describe('update', () => {
    it('actualiza solo los campos enviados', async () => {
      customerRepository.findOne.mockResolvedValue({
        idCustomer: 'customer-1',
        nameCustomer: 'Ana',
        locationCustomer: 'Calle 1',
        phoneCustomer: null,
      });

      const result = await service.update(
        'business-1',
        'customer-1',
        { nameCustomer: 'Ana Maria' },
        'user-1',
      );

      expect(customerRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          nameCustomer: 'Ana Maria',
          locationCustomer: 'Calle 1',
        }),
      );
      expect(result.message).toBe('Cliente actualizado exitosamente');
    });

    it('lanza NotFoundException si el cliente no pertenece al negocio', async () => {
      customerRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('business-1', 'customer-1', {}, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('elimina el cliente', async () => {
      customerRepository.findOne.mockResolvedValue({
        idCustomer: 'customer-1',
      });

      const result = await service.remove('business-1', 'customer-1', 'user-1');

      expect(customerRepository.remove).toHaveBeenCalled();
      expect(result.message).toBe('Cliente eliminado exitosamente');
    });
  });
});
