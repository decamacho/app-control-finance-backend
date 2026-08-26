import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PaymentsService } from './payments.service';
import { BusinessValidatorService } from './business-validator.service';
import { BusinessOrder, OrderStatus } from '../entities/business-order.entity';
import { ParkingTicket, TicketStatus } from '../entities/parking-ticket.entity';
import { Payment } from '../entities/payment.entity';
import { BusinessType } from '../entities/business.entity';
import { PaymentMethod, PaymentStatus } from '../types/payment.enum';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let paymentRepository: Record<string, jest.Mock>;
  let orderRepository: Record<string, jest.Mock>;
  let ticketRepository: Record<string, jest.Mock>;
  let validator: Record<string, jest.Mock>;

  const baseOrder = () => ({
    idOrder: 'order-1',
    totalAmount: '10000',
    paidAmount: '0',
    paymentStatus: PaymentStatus.PENDING,
    statusOrder: OrderStatus.ACTIVE,
    customer: {
      idCustomer: 'customer-1',
      business: {
        idBusiness: 'business-1',
        businessType: BusinessType.FOOD_SALE,
      },
    },
  });

  const baseTicket = () => ({
    idTicket: 'ticket-1',
    totalAmount: '10000',
    paidAmount: '0',
    paymentStatus: PaymentStatus.PENDING,
    statusTicket: TicketStatus.COMPLETED,
    vehicle: {
      idVehicle: 'vehicle-1',
      business: { idBusiness: 'business-1', businessType: BusinessType.PARKING },
    },
  });

  beforeEach(async () => {
    paymentRepository = {
      create: jest.fn().mockImplementation((value: unknown) => value),
      save: jest.fn().mockImplementation((value: unknown) =>
        (Array.isArray(value) ? value : [value]).map(
          (payment: { idPayment?: string }) => ({
            ...payment,
            idPayment: payment.idPayment ?? 'payment-1',
            createdAt: new Date(),
          }),
        ),
      ),
      find: jest.fn(),
    };
    orderRepository = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((value: unknown) => value),
    };
    ticketRepository = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((value: unknown) => value),
    };
    validator = {
      assertBusinessOwnership: jest.fn().mockResolvedValue({
        idBusiness: 'business-1',
      }),
      assertBusinessType: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: getRepositoryToken(Payment), useValue: paymentRepository },
        {
          provide: getRepositoryToken(BusinessOrder),
          useValue: orderRepository,
        },
        {
          provide: getRepositoryToken(ParkingTicket),
          useValue: ticketRepository,
        },
        { provide: BusinessValidatorService, useValue: validator },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('registerOrderPayment', () => {
    it('registra un abono parcial y marca el pedido como PARTIAL', async () => {
      orderRepository.findOne.mockResolvedValue(baseOrder());

      const result = await service.registerOrderPayment(
        'order-1',
        { payments: [{ amount: 3000, paymentMethod: PaymentMethod.NEQUI }] },
        'user-1',
      );

      expect(paymentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 3000,
          paymentMethod: PaymentMethod.NEQUI,
          order: { idOrder: 'order-1' },
        }),
      );
      expect(orderRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          paidAmount: 3000,
          paymentStatus: PaymentStatus.PARTIAL,
        }),
      );
      expect(result.data.order.pendingAmount).toBe(7000);
      expect(result.data.payments[0]).not.toHaveProperty('createdAt');
      expect(result.message).toBe('Pago registrado correctamente');
    });

    it('registra dos medios de pago en una sola llamada', async () => {
      orderRepository.findOne.mockResolvedValue(baseOrder());

      const result = await service.registerOrderPayment(
        'order-1',
        {
          payments: [
            { amount: 4000, paymentMethod: PaymentMethod.NEQUI },
            { amount: 6000, paymentMethod: PaymentMethod.CASH },
          ],
        },
        'user-1',
      );

      expect(paymentRepository.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            amount: 4000,
            paymentMethod: PaymentMethod.NEQUI,
          }),
          expect.objectContaining({
            amount: 6000,
            paymentMethod: PaymentMethod.CASH,
          }),
        ]),
      );
      expect(orderRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          paidAmount: 10000,
          paymentStatus: PaymentStatus.PAID,
        }),
      );
      expect(result.data.order.pendingAmount).toBe(0);
    });

    it('acumula abonos previos hasta quedar PAID', async () => {
      orderRepository.findOne.mockResolvedValue({
        ...baseOrder(),
        paidAmount: '4000',
      });

      const result = await service.registerOrderPayment(
        'order-1',
        { payments: [{ amount: 6000, paymentMethod: PaymentMethod.CASH }] },
        'user-1',
      );

      expect(orderRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          paidAmount: 10000,
          paymentStatus: PaymentStatus.PAID,
        }),
      );
      expect(result.data.payments[0].paymentMethod).toBe(PaymentMethod.CASH);
    });

    it('rechaza pagos que superan el total del pedido', async () => {
      orderRepository.findOne.mockResolvedValue(baseOrder());

      await expect(
        service.registerOrderPayment(
          'order-1',
          {
            payments: [
              { amount: 6000, paymentMethod: PaymentMethod.NEQUI },
              { amount: 5000, paymentMethod: PaymentMethod.CASH },
            ],
          },
          'user-1',
        ),
      ).rejects.toThrow('El pago supera el total del pedido');
    });

    it('rechaza pagos en pedidos cancelados', async () => {
      orderRepository.findOne.mockResolvedValue({
        ...baseOrder(),
        statusOrder: OrderStatus.CANCELLED,
      });

      await expect(
        service.registerOrderPayment(
          'order-1',
          { payments: [{ amount: 3000, paymentMethod: PaymentMethod.NEQUI }] },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('lanza NotFoundException si el pedido no existe', async () => {
      orderRepository.findOne.mockResolvedValue(null);

      await expect(
        service.registerOrderPayment(
          'order-1',
          { payments: [{ amount: 3000, paymentMethod: PaymentMethod.NEQUI }] },
          'user-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('registerTicketPayment', () => {
    it('registra un abono sobre un ticket liquidado', async () => {
      ticketRepository.findOne.mockResolvedValue(baseTicket());

      const result = await service.registerTicketPayment(
        'ticket-1',
        { payments: [{ amount: 5000, paymentMethod: PaymentMethod.NEQUI }] },
        'user-1',
      );

      expect(paymentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 5000,
          paymentMethod: PaymentMethod.NEQUI,
          ticket: { idTicket: 'ticket-1' },
        }),
      );
      expect(ticketRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          paidAmount: 5000,
          paymentStatus: PaymentStatus.PARTIAL,
        }),
      );
      expect(result.data.ticket.pendingAmount).toBe(5000);
      expect(result.data.payments[0]).not.toHaveProperty('createdAt');
      expect(result.message).toBe('Pago registrado correctamente');
    });

    it('marca el ticket como PAID al completar el total', async () => {
      ticketRepository.findOne.mockResolvedValue({
        ...baseTicket(),
        paidAmount: '8000',
      });

      await service.registerTicketPayment(
        'ticket-1',
        { payments: [{ amount: 2000, paymentMethod: PaymentMethod.CASH }] },
        'user-1',
      );

      expect(ticketRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          paidAmount: 10000,
          paymentStatus: PaymentStatus.PAID,
        }),
      );
    });

    it('rechaza pagos que superan el total del ticket', async () => {
      ticketRepository.findOne.mockResolvedValue(baseTicket());

      await expect(
        service.registerTicketPayment(
          'ticket-1',
          { payments: [{ amount: 10001, paymentMethod: PaymentMethod.CASH }] },
          'user-1',
        ),
      ).rejects.toThrow('El pago supera el total del ticket');
    });

    it('rechaza pagos en tickets no liquidados', async () => {
      ticketRepository.findOne.mockResolvedValue({
        ...baseTicket(),
        statusTicket: TicketStatus.ACTIVE,
      });

      await expect(
        service.registerTicketPayment(
          'ticket-1',
          { payments: [{ amount: 5000, paymentMethod: PaymentMethod.NEQUI }] },
          'user-1',
        ),
      ).rejects.toThrow('debe estar liquidado');
    });
  });

  describe('findOrderPayments', () => {
    it('lista los pagos del pedido', async () => {
      orderRepository.findOne.mockResolvedValue(baseOrder());
      paymentRepository.find.mockResolvedValue([
        { idPayment: 'payment-1', amount: 3000, createdAt: new Date() },
      ]);

      const result = await service.findOrderPayments('order-1', 'user-1');

      expect(paymentRepository.find).toHaveBeenCalledWith({
        where: { order: { idOrder: 'order-1' } },
        order: { createdAt: 'DESC' },
      });
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).not.toHaveProperty('createdAt');
    });
  });

  describe('findTicketPayments', () => {
    it('lista los pagos del ticket', async () => {
      ticketRepository.findOne.mockResolvedValue(baseTicket());
      paymentRepository.find.mockResolvedValue([
        { idPayment: 'payment-1', amount: 5000, createdAt: new Date() },
      ]);

      const result = await service.findTicketPayments('ticket-1', 'user-1');

      expect(paymentRepository.find).toHaveBeenCalledWith({
        where: { ticket: { idTicket: 'ticket-1' } },
        order: { createdAt: 'DESC' },
      });
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).not.toHaveProperty('createdAt');
    });
  });
});
