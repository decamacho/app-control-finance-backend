import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { BusinessValidatorService } from './business-validator.service';
import { BusinessProduct } from '../entities/business-product.entity';
import { BusinessType } from '../entities/business.entity';

describe('ProductsService', () => {
  let service: ProductsService;
  let productRepository: Record<string, jest.Mock>;
  let validator: Record<string, jest.Mock>;

  beforeEach(async () => {
    productRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn().mockImplementation((value: unknown) => value),
      save: jest.fn().mockImplementation((value: { idProduct?: string }) => ({
        ...value,
        idProduct: value.idProduct ?? 'product-1',
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
        ProductsService,
        {
          provide: getRepositoryToken(BusinessProduct),
          useValue: productRepository,
        },
        { provide: BusinessValidatorService, useValue: validator },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('lista productos del negocio y valida businessType FOOD_SALE', async () => {
      productRepository.find.mockResolvedValue([
        { idProduct: 'product-1', nameProduct: 'Empanada' },
      ]);

      const result = await service.findAll('business-1', 'user-1');

      expect(productRepository.find).toHaveBeenCalledWith({
        where: { business: { idBusiness: 'business-1' } },
        order: { nameProduct: 'ASC' },
      });
      expect(validator.assertBusinessType).toHaveBeenCalledWith(
        expect.objectContaining({ businessType: BusinessType.FOOD_SALE }),
        BusinessType.FOOD_SALE,
      );
      expect(result.data).toHaveLength(1);
    });
  });

  describe('create', () => {
    it('crea el producto con nombre normalizado', async () => {
      const result = await service.create(
        'business-1',
        { nameProduct: '  Empanada  ', basePrice: 2500 },
        'user-1',
      );

      expect(productRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          nameProduct: 'Empanada',
          basePrice: 2500,
          business: { idBusiness: 'business-1' },
        }),
      );
      expect(result.message).toBe('Producto creado exitosamente');
    });
  });

  describe('update', () => {
    it('actualiza solo los campos enviados', async () => {
      productRepository.findOne.mockResolvedValue({
        idProduct: 'product-1',
        nameProduct: 'Empanada',
        basePrice: 2500,
      });

      const result = await service.update(
        'business-1',
        'product-1',
        { basePrice: 2800 },
        'user-1',
      );

      expect(productRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ nameProduct: 'Empanada', basePrice: 2800 }),
      );
      expect(result.message).toBe('Producto actualizado exitosamente');
    });

    it('lanza NotFoundException si el producto no pertenece al negocio', async () => {
      productRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('business-1', 'product-1', {}, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('elimina el producto', async () => {
      productRepository.findOne.mockResolvedValue({ idProduct: 'product-1' });

      const result = await service.remove('business-1', 'product-1', 'user-1');

      expect(productRepository.remove).toHaveBeenCalled();
      expect(result.message).toBe('Producto eliminado exitosamente');
    });
  });
});
