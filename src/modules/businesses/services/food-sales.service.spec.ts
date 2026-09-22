import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Between, IsNull } from 'typeorm';
import { FoodSalesService } from './food-sales.service';
import { BusinessValidatorService } from './business-validator.service';
import { CustomerProductPriceService } from './customer-product-price.service';
import { BusinessOrder, OrderStatus } from '../entities/business-order.entity';
import { BusinessOrderItem } from '../entities/business-order-item.entity';
import { BusinessCustomer } from '../entities/business-customer.entity';
import { BusinessProduct } from '../entities/business-product.entity';
import { RecurringOrder } from '../entities/recurring-order.entity';
import { Payment } from '../entities/payment.entity';
import { BusinessType } from '../entities/business.entity';
import { PaymentStatus, PaymentMethod } from '../types/payment.enum';

describe('FoodSalesService', () => {
  let service: FoodSalesService;
  let orderRepository: Record<string, jest.Mock>;
  let itemRepository: Record<string, jest.Mock>;
  let customerRepository: Record<string, jest.Mock>;
  let productRepository: Record<string, jest.Mock>;
  let paymentRepository: Record<string, jest.Mock>;
  let validator: Record<string, jest.Mock>;
  let cppService: Record<string, jest.Mock>;

  const baseDto = () => ({
    idBusiness: 'business-1',
    idCustomer: 'customer-1',
    deliveryTime: new Date(2026, 0, 2, 12, 0, 0, 0),
    items: [{ idProduct: 'product-1', quantity: 2 }],
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
    paymentRepository = {
      find: jest.fn(),
    };
    validator = {
      assertBusinessOwnership: jest.fn().mockResolvedValue({
        idBusiness: 'business-1',
        businessType: BusinessType.FOOD_SALE,
      }),
      assertBusinessType: jest.fn(),
    };
    cppService = {
      getPrice: jest
        .fn()
        .mockImplementation((_c: unknown, _p: unknown, base: unknown) => base),
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
        {
          provide: getRepositoryToken(Payment),
          useValue: paymentRepository,
        },
        {
          provide: getRepositoryToken(RecurringOrder),
          useValue: { find: jest.fn(), save: jest.fn(), create: jest.fn() },
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
    it('recalcula subtotales y total; precio del cliente gana al basePrice', async () => {
      customerRepository.findOne.mockResolvedValue({
        idCustomer: 'customer-1',
      });
      productRepository.findOne
        .mockResolvedValueOnce({ idProduct: 'product-1', basePrice: '2500' })
        .mockResolvedValueOnce({ idProduct: 'product-2', basePrice: '1500' });
      cppService.getPrice
        .mockResolvedValueOnce(2300)
        .mockResolvedValueOnce(1500);

      const result = await service.createOrder(
        {
          ...baseDto(),
          items: [
            { idProduct: 'product-1', quantity: 2 },
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

  describe('createExpense', () => {
    it('registra gasto sin cliente, con business y pagado', async () => {
      orderRepository.save.mockResolvedValue({ idOrder: 'order-expense' });

      const result = await service.createOrder(
        {
          orderType: 'EXPENSE',
          idBusiness: 'business-1',
          deliveryTime: new Date(2026, 0, 2, 8, 0, 0, 0),
          description: 'Cubetas de huevo y cafe',
          totalAmount: 45000,
          paymentMethod: 'CASH',
        },
        'user-1',
      );

      expect(orderRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          orderType: 'EXPENSE',
          customer: null,
          business: { idBusiness: 'business-1' },
          totalAmount: 45000,
          paidAmount: 45000,
          paymentStatus: PaymentStatus.PAID,
          statusOrder: OrderStatus.ACTIVE,
        }),
      );
      expect(result.message).toBe('Gasto registrado exitosamente');
    });
  });

  describe('findAll', () => {
    it('filtra pedidos por business, status, paymentStatus y fecha', async () => {
      orderRepository.find.mockResolvedValue([baseOrder()]);

      const result = await service.findAll(
        {
          idBusiness: 'business-1',
          date: '2026-01-02',
          status: OrderStatus.ACTIVE,
          paymentStatus: PaymentStatus.PENDING,
        },
        'user-1',
      );

      expect(orderRepository.find).toHaveBeenCalledWith({
        where: [
          {
            customer: { business: { idBusiness: 'business-1' } },
            statusOrder: OrderStatus.ACTIVE,
            paymentStatus: PaymentStatus.PENDING,
            deliveryTime: Between(
              '2026-01-02T00:00:00.000Z',
              '2026-01-02T23:59:59.999Z',
            ),
          },
          {
            business: { idBusiness: 'business-1' },
            statusOrder: OrderStatus.ACTIVE,
            paymentStatus: PaymentStatus.PENDING,
            deliveryTime: Between(
              '2026-01-02T00:00:00.000Z',
              '2026-01-02T23:59:59.999Z',
            ),
          },
        ],
        relations: {
          items: { product: true },
          customer: true,
          deliveries: { items: { orderItem: { product: true } } },
        },
        order: { createdAt: 'DESC' },
      });
      expect(result.data).toHaveLength(1);
    });

    it('usa el día actual por defecto', async () => {
      orderRepository.find.mockResolvedValue([]);

      const result = await service.findAll(
        { idBusiness: 'business-1' },
        'user-1',
      );

      const todayStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Bogota',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date());

      expect(orderRepository.find).toHaveBeenCalledWith({
        where: [
          {
            customer: { business: { idBusiness: 'business-1' } },
            statusOrder: OrderStatus.ACTIVE,
            deliveryTime: Between(
              `${todayStr}T00:00:00.000Z`,
              `${todayStr}T23:59:59.999Z`,
            ),
          },
          {
            business: { idBusiness: 'business-1' },
            statusOrder: OrderStatus.ACTIVE,
            deliveryTime: Between(
              `${todayStr}T00:00:00.000Z`,
              `${todayStr}T23:59:59.999Z`,
            ),
          },
        ],
        relations: {
          items: { product: true },
          customer: true,
          deliveries: { items: { orderItem: { product: true } } },
        },
        order: { createdAt: 'DESC' },
      });
      expect(result.data).toHaveLength(0);
    });

    it('permite listar cancelados con filtro status explícito', async () => {
      orderRepository.find.mockResolvedValue([baseOrder()]);

      await service.findAll(
        {
          idBusiness: 'business-1',
          date: '2026-01-02',
          status: OrderStatus.CANCELLED,
        },
        'user-1',
      );

      expect(orderRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: [
            expect.objectContaining({ statusOrder: OrderStatus.CANCELLED }),
            expect.objectContaining({ statusOrder: OrderStatus.CANCELLED }),
          ],
        }),
      );
    });
  });

  describe('getDailySummary', () => {
    it('calcula recibido, efectivo, otros métodos, gastos y neto del día', async () => {
      orderRepository.find.mockResolvedValue([
        {
          idOrder: 'sale-1',
          orderType: 'SALE',
          paidAmount: '5000',
          totalAmount: '5000',
        },
        {
          idOrder: 'sale-2',
          orderType: 'SALE',
          paidAmount: '8500',
          totalAmount: '10000',
        },
        {
          idOrder: 'exp-1',
          orderType: 'EXPENSE',
          paidAmount: '45000',
          totalAmount: '45000',
        },
      ]);

      paymentRepository.find.mockResolvedValue([
        {
          amount: '5000',
          paymentMethod: PaymentMethod.CASH,
          order: {
            idOrder: 'sale-1',
            orderType: 'SALE',
            customer: { business: { idBusiness: 'business-1' } },
            business: null,
          },
        },
        {
          amount: '3500',
          paymentMethod: PaymentMethod.NEQUI,
          order: {
            idOrder: 'sale-1',
            orderType: 'SALE',
            customer: { business: { idBusiness: 'business-1' } },
            business: null,
          },
        },
        {
          amount: '99999',
          paymentMethod: PaymentMethod.CASH,
          order: {
            idOrder: 'otro-negocio',
            orderType: 'SALE',
            customer: { business: { idBusiness: 'business-2' } },
            business: null,
          },
        },
        {
          amount: '123',
          paymentMethod: PaymentMethod.DEVIPLATA,
          order: null,
        },
      ]);

      const result = await service.getDailySummary(
        'business-1',
        { date: '2026-01-02' },
        'user-1',
      );

      expect(orderRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: [
            expect.objectContaining({
              customer: { business: { idBusiness: 'business-1' } },
              orderType: 'SALE',
              statusOrder: OrderStatus.ACTIVE,
            }),
            expect.objectContaining({
              business: { idBusiness: 'business-1' },
              orderType: 'EXPENSE',
              statusOrder: OrderStatus.ACTIVE,
            }),
          ],
        }),
      );
      expect(paymentRepository.find).toHaveBeenCalledWith({
        where: [
          {
            paymentDate: Between(
              '2026-01-02T00:00:00.000Z',
              '2026-01-02T23:59:59.999Z',
            ),
          },
          {
            paymentDate: IsNull(),
            createdAt: Between(
              '2026-01-02T00:00:00.000Z',
              '2026-01-02T23:59:59.999Z',
            ),
          },
        ],
        relations: {
          order: { customer: { business: true }, business: true },
        },
      });
      expect(result.data).toEqual({
        date: '2026-01-02',
        received: 8500,
        cash: 5000,
        otherPayment: 3500,
        expenses: 45000,
        net: -36500,
        salesCount: 2,
        expensesCount: 1,
      });
    });

    it('usa fecha de hoy por defecto', async () => {
      orderRepository.find.mockResolvedValue([]);
      paymentRepository.find.mockResolvedValue([]);

      const result = await service.getDailySummary('business-1', {}, 'user-1');

      expect(result.data.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.data).toEqual(
        expect.objectContaining({
          received: 0,
          cash: 0,
          otherPayment: 0,
          expenses: 0,
          net: 0,
          salesCount: 0,
          expensesCount: 0,
        }),
      );
    });
  });

  describe('getDailySummaryByCustomer', () => {
    it('agrupa por cliente: totales, deuda, pago parcial y entregas pendientes', async () => {
      orderRepository.find.mockResolvedValue([
        {
          idOrder: 'sale-1',
          orderType: 'SALE',
          totalAmount: '50000',
          paidAmount: '0',
          createdAt: new Date(2026, 0, 2, 9, 0, 0, 0),
          customer: { idCustomer: 'customer-1', nameCustomer: 'Don Jorge' },
          items: [
            {
              quantity: 20,
              product: {
                idProduct: 'product-1',
                nameProduct: 'Arepa de huevo',
              },
            },
          ],
          deliveries: [
            {
              items: [
                {
                  quantity: 20,
                  orderItem: { product: { idProduct: 'product-1' } },
                },
              ],
            },
          ],
        },
        {
          idOrder: 'sale-2',
          orderType: 'SALE',
          totalAmount: '100000',
          paidAmount: '50000',
          createdAt: new Date(2026, 0, 2, 8, 0, 0, 0),
          customer: { idCustomer: 'customer-2', nameCustomer: 'Suba' },
          items: [
            {
              quantity: 20,
              product: {
                idProduct: 'product-1',
                nameProduct: 'Arepa de huevo',
              },
            },
            {
              quantity: 5,
              product: { idProduct: 'product-2', nameProduct: 'Papa rellena' },
            },
          ],
          deliveries: [
            {
              items: [
                {
                  quantity: 7,
                  orderItem: { product: { idProduct: 'product-1' } },
                },
              ],
            },
          ],
        },
        {
          idOrder: 'exp-1',
          orderType: 'EXPENSE',
          totalAmount: '8300',
          paidAmount: '8300',
          createdAt: new Date(2026, 0, 2, 10, 0, 0, 0),
          customer: null,
          items: [],
          deliveries: [],
        },
        {
          idOrder: 'sale-3',
          orderType: 'SALE',
          totalAmount: '5000',
          paidAmount: '5000',
          createdAt: new Date(2026, 0, 2, 9, 30, 0, 0),
          customer: { idCustomer: 'customer-1', nameCustomer: 'Don Jorge' },
          items: [
            {
              quantity: 1,
              product: { idProduct: 'product-2', nameProduct: 'Papa rellena' },
            },
          ],
          deliveries: [
            {
              items: [
                {
                  quantity: 1,
                  orderItem: { product: { idProduct: 'product-2' } },
                },
              ],
            },
          ],
        },
      ]);

      paymentRepository.find.mockResolvedValue([
        {
          amount: '50000',
          paymentMethod: PaymentMethod.CASH,
          order: {
            idOrder: 'sale-2',
            orderType: 'SALE',
            customer: { business: { idBusiness: 'business-1' } },
            business: null,
          },
        },
      ]);

      const result = await service.getDailySummaryByCustomer(
        'business-1',
        { date: '2026-01-02' },
        'user-1',
      );

      expect(orderRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          relations: {
            customer: true,
            business: true,
            items: { product: true },
            deliveries: { items: { orderItem: { product: true } } },
          },
        }),
      );
      expect(result.data.date).toBe('2026-01-02');
      expect(result.data.summary).toEqual({
        received: 50000,
        cash: 50000,
        otherPayment: 0,
        expenses: 8300,
        net: 41700,
        salesCount: 3,
        expensesCount: 1,
      });

      expect(result.data.customers).toHaveLength(2);

      const donJorge = result.data.customers[0];
      expect(donJorge).toEqual({
        idCustomer: 'customer-1',
        nameCustomer: 'Don Jorge',
        total: 55000,
        paid: 5000,
        owed: 50000,
        paymentStatus: PaymentStatus.PARTIAL,
        paymentLabel: 'Parcialmente pago',
        deliveryStatus: 'DELIVERED',
        deliveryLabel: 'Entregado',
        items: [
          {
            idProduct: 'product-1',
            nameProduct: 'Arepa de huevo',
            quantity: 20,
          },
          { idProduct: 'product-2', nameProduct: 'Papa rellena', quantity: 1 },
        ],
        pendingDeliveryItems: [],
        ordersCount: 2,
      });

      const suba = result.data.customers[1];
      expect(suba).toEqual({
        idCustomer: 'customer-2',
        nameCustomer: 'Suba',
        total: 100000,
        paid: 50000,
        owed: 50000,
        paymentStatus: PaymentStatus.PARTIAL,
        paymentLabel: 'Parcialmente pago',
        deliveryStatus: 'PARTIAL_DELIVERED',
        deliveryLabel: 'Entrega parcial',
        items: [
          {
            idProduct: 'product-1',
            nameProduct: 'Arepa de huevo',
            quantity: 20,
          },
          { idProduct: 'product-2', nameProduct: 'Papa rellena', quantity: 5 },
        ],
        pendingDeliveryItems: [
          {
            idProduct: 'product-1',
            nameProduct: 'Arepa de huevo',
            quantity: 13,
          },
          { idProduct: 'product-2', nameProduct: 'Papa rellena', quantity: 5 },
        ],
        ordersCount: 1,
      });
    });

    it('marca pendiente pago cuando paga cero y pendiente entrega sin entregas', async () => {
      orderRepository.find.mockResolvedValue([
        {
          idOrder: 'sale-1',
          orderType: 'SALE',
          totalAmount: '50000',
          paidAmount: '0',
          createdAt: new Date(2026, 0, 2, 9, 0, 0, 0),
          customer: { idCustomer: 'customer-1', nameCustomer: 'Don Jorge' },
          items: [
            {
              quantity: 20,
              product: {
                idProduct: 'product-1',
                nameProduct: 'Arepa de huevo',
              },
            },
          ],
          deliveries: [],
        },
      ]);
      paymentRepository.find.mockResolvedValue([]);

      const result = await service.getDailySummaryByCustomer(
        'business-1',
        { date: '2026-01-02' },
        'user-1',
      );

      expect(result.data.customers[0]).toEqual(
        expect.objectContaining({
          paymentStatus: PaymentStatus.PENDING,
          paymentLabel: 'Pendiente pago',
          deliveryStatus: 'NOT_DELIVERED',
          deliveryLabel: 'Pendiente entrega',
          owed: 50000,
          pendingDeliveryItems: [
            {
              idProduct: 'product-1',
              nameProduct: 'Arepa de huevo',
              quantity: 20,
            },
          ],
        }),
      );
    });

    it('orienta del pedido más reciente al más antiguo', async () => {
      orderRepository.find.mockResolvedValue([
        {
          idOrder: 'sale-viejo',
          orderType: 'SALE',
          totalAmount: '1000',
          paidAmount: '0',
          createdAt: new Date(2026, 0, 2, 7, 0, 0, 0),
          customer: { idCustomer: 'customer-1', nameCustomer: 'Cuchita' },
          items: [],
          deliveries: [],
        },
        {
          idOrder: 'sale-reciente',
          orderType: 'SALE',
          totalAmount: '2000',
          paidAmount: '0',
          createdAt: new Date(2026, 0, 2, 11, 0, 0, 0),
          customer: { idCustomer: 'customer-2', nameCustomer: 'Miguel' },
          items: [],
          deliveries: [],
        },
      ]);
      paymentRepository.find.mockResolvedValue([]);

      const result = await service.getDailySummaryByCustomer(
        'business-1',
        { date: '2026-01-02' },
        'user-1',
      );

      expect(result.data.customers.map((c) => c.nameCustomer)).toEqual([
        'Miguel',
        'Cuchita',
      ]);
    });

    it('un pago de hoy contra una orden de otro dia suma a received pero deja pendiente el pedido de hoy', async () => {
      orderRepository.find.mockResolvedValue([
        {
          idOrder: 'sale-hoy',
          orderType: 'SALE',
          totalAmount: '50000',
          paidAmount: '0',
          createdAt: new Date(2026, 0, 2, 9, 0, 0, 0),
          customer: { idCustomer: 'customer-1', nameCustomer: 'Don Jorge' },
          items: [],
          deliveries: [],
        },
      ]);

      paymentRepository.find.mockResolvedValue([
        {
          amount: '50000',
          paymentMethod: PaymentMethod.CASH,
          order: {
            idOrder: 'sale-pasado',
            orderType: 'SALE',
            customer: { business: { idBusiness: 'business-1' } },
            business: null,
          },
        },
      ]);

      const result = await service.getDailySummaryByCustomer(
        'business-1',
        { date: '2026-01-02' },
        'user-1',
      );

      expect(result.data.summary.received).toBe(50000);
      expect(result.data.summary.cash).toBe(50000);
      expect(result.data.customers[0]).toEqual(
        expect.objectContaining({
          paid: 0,
          owed: 50000,
          paymentStatus: PaymentStatus.PENDING,
          paymentLabel: 'Pendiente pago',
        }),
      );
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
          business: true,
          items: { product: true },
          deliveries: { items: { orderItem: { product: true } } },
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
