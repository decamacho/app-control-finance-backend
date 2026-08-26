import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FoodSalesService } from './food-sales.service';
import { BusinessValidatorService } from './business-validator.service';
import { CustomerProductPriceService } from './customer-product-price.service';
import { BusinessOrder, OrderStatus } from '../entities/business-order.entity';
import { BusinessOrderItem } from '../entities/business-order-item.entity';
import { BusinessCustomer } from '../entities/business-customer.entity';
import { BusinessProduct } from '../entities/business-product.entity';
import { BusinessType } from '../entities/business.entity';
import { PaymentStatus } from '../types/payment.enum';

describe('FoodSalesService', () => {
  let service: FoodSalesService;
  let orderRepository: Record<string, jest.Mock>;
  let itemRepository: Record<string, jest.Mock>;
  let customerRepository: Record<string, jest.Mock>;
  let productRepository: Record<string, jest.Mock>;
  let validator: Record<string, jest.Mock>;
  let cppService: Record<string, jest.Mock>;

  const baseDto = () => ({
    idBusiness: 'business-1',
    idCustomer: 'customer-1',
    deliveryTime: new Date(2026, 0, 2, 12, 0, 0, 0),
    items: [{ idProduct: 'product-1', quantity: 2, unitPrice: 2300 }],
  });

  const baseOrder = () => ({
    idOrder: 'order-1',
    deliveryTime: new Date(2026, 0, 2, 12, 0, 0, 0),
    totalAmount: '9100',
    paidAmount: '0',
    paymentStatus: PaymentStatus.PENDING,
    statusOrder: OrderStatus.ACTIVE,
    customer: {
      idCustomer: 'customer-1',
      business: { idBusiness: 'business-1' },
    },
    items: [],
  });

  beforeEach(async () => {
    orderRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn().mockImplementation((value: unknown) => value),
      save: jest.fn().mockImplementation((value: { idOrder?: string }) => ({
        ...value,
        idOrder: value.idOrder ?? 'order-1',
      })),
    };
    itemRepository = {
      create: jest.fn().mockImplementation((value: unknown) => value),
    };
    customerRepository = {
      findOne: jest.fn(),
    };
    productRepository = {
      findOne: jest.fn(),
    };
    validator = {
      assertBusinessOwnership: jest.fn().mockResolvedValue({
        idBusiness: 'business-1',
        businessType: BusinessType.FOOD_SALE,
      }),
      assertBusinessType: jest.fn(),
    };
    cppService = {
      getPrice: jest.fn().mockImplementation((_c, _p, base) => base),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FoodSalesService,
        {
          provide: getRepositoryToken(BusinessOrder),
          useValue: orderRepository,
        },
        {
          provide: getRepositoryToken(BusinessOrderItem),
          useValue: itemRepository,
        },
        {
          provide: getRepositoryToken(BusinessCustomer),
          useValue: customerRepository,
        },
        {
          provide: getRepositoryToken(BusinessProduct),
          useValue: productRepository,
        },
        { provide: BusinessValidatorService, useValue: validator },
        { provide: CustomerProductPriceService, useValue: cppService },
      ],
    }).compile();

    service = module.get<FoodSalesService>(FoodSalesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createOrder', () => {
    it('recalcula subtotales y total; el unitPrice pactado gana al basePrice', async () => {
      customerRepository.findOne.mockResolvedValue({
        idCustomer: 'customer-1',
      });
      productRepository.findOne
        .mockResolvedValueOnce({ idProduct: 'product-1', basePrice: '2500' })
        .mockResolvedValueOnce({ idProduct: 'product-2', basePrice: '1500' });

      const result = await service.createOrder(
        {
          ...baseDto(),
          items: [
            { idProduct: 'product-1', quantity: 2, unitPrice: 2300 },
            { idProduct: 'product-2', quantity: 3 },
          ],
        },
        'user-1',
      );

      const calls = orderRepository.create.mock.calls as unknown as Array<
        Array<{
          items: Array<{
            quantity: number;
            unitPrice: number;
            subtotal: number;
          }>;
        }>
      >;
      const created = calls[0]?.[0];

      expect(orderRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          totalAmount: 9100,
          paidAmount: 0,
          paymentStatus: PaymentStatus.PENDING,
          statusOrder: OrderStatus.ACTIVE,
          customer: { idCustomer: 'customer-1' },
        }),
      );
      expect(created.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            quantity: 2,
            unitPrice: 2300,
            subtotal: 4600,
          }),
          expect.objectContaining({
            quantity: 3,
            unitPrice: 1500,
            subtotal: 4500,
          }),
        ]),
      );
      expect(result.message).toBe('Pedido creado exitosamente');
    });

    it('rechaza cliente que no pertenece al negocio', async () => {
      customerRepository.findOne.mockResolvedValue(null);

      await expect(service.createOrder(baseDto(), 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rechaza producto que no pertenece al negocio', async () => {
      customerRepository.findOne.mockResolvedValue({
        idCustomer: 'customer-1',
      });
      productRepository.findOne.mockResolvedValue(null);

      await expect(service.createOrder(baseDto(), 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('filtra pedidos por business, status y paymentStatus', async () => {
      orderRepository.find.mockResolvedValue([baseOrder()]);

      const result = await service.findAll(
        {
          idBusiness: 'business-1',
          status: OrderStatus.ACTIVE,
          paymentStatus: PaymentStatus.PENDING,
        },
        'user-1',
      );

      expect(orderRepository.find).toHaveBeenCalledWith({
        where: {
          customer: { business: { idBusiness: 'business-1' } },
          statusOrder: OrderStatus.ACTIVE,
          paymentStatus: PaymentStatus.PENDING,
        },
        relations: { items: { product: true }, customer: true },
        order: { deliveryTime: 'DESC' },
      });
      expect(result.data).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('retorna el detalle con items', async () => {
      orderRepository.findOne.mockResolvedValue(baseOrder());

      const result = await service.findOne('order-1', 'user-1');

      expect(orderRepository.findOne).toHaveBeenCalledWith({
        where: { idOrder: 'order-1' },
        relations: {
          customer: { business: true },
          items: { product: true },
        },
      });
      expect(result.data).toEqual(
        expect.objectContaining({
          idOrder: 'order-1',
          pendingAmount: 9100,
        }),
      );
    });

    it('lanza NotFoundException cuando el pedido no existe', async () => {
      orderRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('order-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('cancel', () => {
    it('cancela pedidos activos', async () => {
      orderRepository.findOne.mockResolvedValue(baseOrder());

      const result = await service.cancel('order-1', 'user-1');

      expect(orderRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ statusOrder: OrderStatus.CANCELLED }),
      );
      expect(result.message).toBe('Pedido cancelado exitosamente');
    });

    it('rechaza cancelar pedidos no activos', async () => {
      orderRepository.findOne.mockResolvedValue({
        ...baseOrder(),
        statusOrder: OrderStatus.CANCELLED,
      });

      await expect(service.cancel('order-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
