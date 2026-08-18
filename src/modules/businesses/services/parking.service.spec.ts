import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ParkingService } from './parking.service';
import { BusinessValidatorService } from './business-validator.service';
import { PricingService } from './pricing.service';
import { Vehicle, VehicleType } from '../entities/vehicle.entity';
import { ParkingTicket, TicketStatus } from '../entities/parking-ticket.entity';
import { ParkingRate, ShiftType } from '../entities/parking-rate.entity';
import { Payment } from '../entities/payment.entity';
import { BusinessType } from '../entities/business.entity';
import { PaymentStatus } from '../types/payment.enum';

describe('ParkingService', () => {
  let service: ParkingService;
  let vehicleRepository: Record<string, jest.Mock>;
  let ticketRepository: Record<string, jest.Mock>;
  let rateRepository: Record<string, jest.Mock>;
  let paymentRepository: Record<string, jest.Mock>;
  let validator: Record<string, jest.Mock>;
  let pricingService: Record<string, jest.Mock>;

  const freshBaseTicket = () => ({
    idTicket: 'ticket-1',
    entryTime: new Date(2026, 0, 1, 10, 0, 0, 0),
    exitTime: null,
    totalAmount: null,
    statusTicket: TicketStatus.ACTIVE,
    business: { idBusiness: 'business-1' },
    vehicle: { idVehicle: 'vehicle-1', vehicleType: VehicleType.MOTO },
  });

  const fullRates = () => [
    { shiftType: ShiftType.DAY, price: '6000' },
    { shiftType: ShiftType.NIGHT, price: '6000' },
    { shiftType: ShiftType.HOUR, price: '1000' },
  ];

  beforeEach(async () => {
    vehicleRepository = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((value: unknown) => value),
      save: jest.fn().mockImplementation((value: { idVehicle?: string }) => ({
        ...value,
        idVehicle: value.idVehicle ?? 'vehicle-1',
      })),
    };
    ticketRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn().mockImplementation((value: unknown) => value),
      save: jest.fn().mockImplementation((value: unknown) => value),
    };
    rateRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
    };
    paymentRepository = {
      create: jest.fn().mockImplementation((value: unknown) => value),
      save: jest.fn().mockImplementation((value: { idPayment?: string }) => ({
        ...value,
        idPayment: value.idPayment ?? 'payment-1',
      })),
    };
    validator = {
      assertBusinessOwnership: jest.fn().mockResolvedValue({
        idBusiness: 'business-1',
        businessType: BusinessType.PARKING,
      }),
      assertBusinessType: jest.fn(),
    };
    pricingService = {
      calculateTotal: jest.fn().mockReturnValue(9000),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParkingService,
        { provide: getRepositoryToken(Vehicle), useValue: vehicleRepository },
        {
          provide: getRepositoryToken(ParkingTicket),
          useValue: ticketRepository,
        },
        { provide: getRepositoryToken(ParkingRate), useValue: rateRepository },
        { provide: getRepositoryToken(Payment), useValue: paymentRepository },
        { provide: BusinessValidatorService, useValue: validator },
        { provide: PricingService, useValue: pricingService },
      ],
    }).compile();

    service = module.get<ParkingService>(ParkingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('registerEntry', () => {
    const dto = {
      idBusiness: 'business-1',
      licensePlate: 'abc 19h',
    };

    const registeredVehicle = () => ({
      idVehicle: 'vehicle-1',
      vehicleType: VehicleType.MOTO,
    });

    it('registra el ticket de entrada con placa normalizada', async () => {
      vehicleRepository.findOne.mockResolvedValue(registeredVehicle());
      ticketRepository.findOne.mockResolvedValue(null);

      const result = await service.registerEntry(dto, 'user-1');

      expect(vehicleRepository.findOne).toHaveBeenCalledWith({
        where: {
          business: { idBusiness: 'business-1' },
          licensePlate: 'ABC19H',
        },
      });
      expect(vehicleRepository.create).not.toHaveBeenCalled();
      expect(ticketRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          statusTicket: TicketStatus.ACTIVE,
          business: { idBusiness: 'business-1' },
          vehicle: { idVehicle: 'vehicle-1' },
        }),
      );
      expect(result.message).toBe('Entrada registrada correctamente');
    });

    it('rechaza la entrada si la placa no esta registrada', async () => {
      vehicleRepository.findOne.mockResolvedValue(null);

      await expect(service.registerEntry(dto, 'user-1')).rejects.toThrow(
        'El vehiculo no esta registrado',
      );
    });

    it('rechaza una placa con formato incorrecto para el tipo de vehiculo', async () => {
      vehicleRepository.findOne.mockResolvedValue(registeredVehicle());

      await expect(
        service.registerEntry({ ...dto, licensePlate: 'abc 123' }, 'user-1'),
      ).rejects.toThrow('no es valida para MOTO');
    });

    it('registra la salida si el vehiculo tiene ticket activo, sin abrir nueva entrada', async () => {
      vehicleRepository.findOne.mockResolvedValue(registeredVehicle());
      ticketRepository.findOne.mockResolvedValue(freshBaseTicket());
      rateRepository.find.mockResolvedValue(fullRates());

      const result = await service.registerEntry(dto, 'user-1');

      expect(ticketRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          totalAmount: 9000,
          statusTicket: TicketStatus.COMPLETED,
        }),
      );
      expect(ticketRepository.create).not.toHaveBeenCalled();
      expect(result.message).toBe('Salida registrada correctamente');
    });

    it('rechaza la entrada si el vehiculo tiene mensualidad activa', async () => {
      vehicleRepository.findOne.mockResolvedValue({
        ...registeredVehicle(),
        monthlyStartDate: new Date(2026, 0, 1),
        monthlyEndDate: null,
      });

      await expect(service.registerEntry(dto, 'user-1')).rejects.toThrow(
        'El vehiculo tiene una mensualidad activa; debe cancelarla',
      );
    });
  });

  describe('completeExit', () => {
    const freshTicket = () => freshBaseTicket();

    it('liquida el total y completa el ticket', async () => {
      ticketRepository.findOne.mockResolvedValue(freshTicket());
      rateRepository.find.mockResolvedValue(fullRates());

      const result = await service.completeExit('ticket-1', {}, 'user-1');

      expect(ticketRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          totalAmount: 9000,
          statusTicket: TicketStatus.COMPLETED,
          exitTime: expect.any(Date) as Date,
        }),
      );
      expect(result.message).toBe('Salida registrada y total liquidado');
    });

    it('rechaza la salida cuando el vehiculo tiene mensualidad activa', async () => {
      ticketRepository.findOne.mockResolvedValue({
        ...freshTicket(),
        vehicle: {
          idVehicle: 'vehicle-1',
          vehicleType: VehicleType.MOTO,
          monthlyStartDate: new Date(2025, 11, 1),
          monthlyEndDate: null,
        },
      });

      await expect(
        service.completeExit('ticket-1', {}, 'user-1'),
      ).rejects.toThrow(
        'El vehiculo tiene una mensualidad activa; debe cancelarla',
      );
    });

    it('rechaza tickets no activos', async () => {
      ticketRepository.findOne.mockResolvedValue({
        ...freshTicket(),
        statusTicket: TicketStatus.COMPLETED,
      });

      await expect(
        service.completeExit('ticket-1', {}, 'user-1'),
      ).rejects.toThrow('no se encuentra activo');
    });

    it('rechaza una salida manual anterior a la entrada', async () => {
      ticketRepository.findOne.mockResolvedValue(freshTicket());

      await expect(
        service.completeExit(
          'ticket-1',
          { exitTime: new Date(2026, 0, 1, 9, 0, 0, 0) },
          'user-1',
        ),
      ).rejects.toThrow('debe ser posterior');
    });

    it('rechaza liquidar si faltan tarifas para el tipo de vehiculo', async () => {
      ticketRepository.findOne.mockResolvedValue(freshTicket());
      rateRepository.find.mockResolvedValue([
        { shiftType: ShiftType.DAY, price: '6000' },
        { shiftType: ShiftType.NIGHT, price: '6000' },
      ]);

      await expect(
        service.completeExit('ticket-1', {}, 'user-1'),
      ).rejects.toThrow('No hay tarifa configurada');
    });
  });

  describe('mensualidad', () => {
    it('activa la mensualidad registrando el pago y la fecha de inicio', async () => {
      ticketRepository.findOne.mockResolvedValue(freshBaseTicket());
      rateRepository.findOne.mockResolvedValue({ price: '90000' });

      const result = await service.registerMonthly(
        'ticket-1',
        { paymentMethod: 'NEQUI' },
        'user-1',
      );

      expect(vehicleRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          monthlyStartDate: expect.any(Date) as Date,
          monthlyEndDate: null,
        }),
      );
      expect(paymentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 90000,
          paymentMethod: 'NEQUI',
          ticket: { idTicket: 'ticket-1' },
        }),
      );
      expect(result.message).toBe('Mensualidad activada correctamente');
    });

    it('activa la mensualidad con pago en 0 si no se envia paymentMethod', async () => {
      ticketRepository.findOne.mockResolvedValue(freshBaseTicket());
      rateRepository.findOne.mockResolvedValue({ price: '90000' });

      const result = await service.registerMonthly('ticket-1', {}, 'user-1');

      expect(paymentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 0,
          paymentMethod: null,
          ticket: { idTicket: 'ticket-1' },
        }),
      );
      expect(result.message).toBe('Mensualidad activada correctamente');
    });

    it('rechaza activar mensualidad sin tarifa mensual configurada', async () => {
      ticketRepository.findOne.mockResolvedValue(freshBaseTicket());
      rateRepository.findOne.mockResolvedValue(null);

      await expect(
        service.registerMonthly(
          'ticket-1',
          { paymentMethod: 'CASH' },
          'user-1',
        ),
      ).rejects.toThrow('No hay tarifa mensual configurada');
    });

    it('rechaza activar mensualidad sobre un ticket no activo', async () => {
      ticketRepository.findOne.mockResolvedValue({
        ...freshBaseTicket(),
        statusTicket: TicketStatus.COMPLETED,
      });

      await expect(
        service.registerMonthly(
          'ticket-1',
          { paymentMethod: 'CASH' },
          'user-1',
        ),
      ).rejects.toThrow('Solo se puede activar la mensualidad');
    });

    it('cancela la mensualidad y recalcula los dias dentro del mes', async () => {
      ticketRepository.findOne.mockResolvedValue({
        ...freshBaseTicket(),
        vehicle: {
          idVehicle: 'vehicle-1',
          vehicleType: VehicleType.MOTO,
          monthlyStartDate: new Date(2025, 11, 1),
          monthlyEndDate: null,
        },
      });
      ticketRepository.find.mockResolvedValue([
        {
          idTicket: 'ticket-9',
          entryTime: new Date(2025, 11, 2, 10, 0, 0, 0),
          exitTime: new Date(2025, 11, 2, 12, 0, 0, 0),
          totalAmount: '0',
          paidAmount: '0',
          statusTicket: TicketStatus.COMPLETED,
          business: { idBusiness: 'business-1' },
        },
      ]);
      rateRepository.find.mockResolvedValue(fullRates());

      const result = await service.cancelMonthly('ticket-1', 'user-1');

      expect(ticketRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          totalAmount: 9000,
          paymentStatus: PaymentStatus.PENDING,
        }),
      );
      expect(result.data.recalculatedTickets).toBe(1);
      expect(result.message).toBe('Mensualidad cancelada y dias liquidados');
    });

    it('rechaza cancelar si el vehiculo no tiene mensualidad', async () => {
      ticketRepository.findOne.mockResolvedValue({
        ...freshBaseTicket(),
        vehicle: { idVehicle: 'vehicle-1', vehicleType: VehicleType.MOTO },
      });

      await expect(service.cancelMonthly('ticket-1', 'user-1')).rejects.toThrow(
        'no tiene mensualidad activa',
      );
    });
  });

  describe('cancel', () => {
    const freshTicket = () => freshBaseTicket();

    it('cancela tickets activos', async () => {
      ticketRepository.findOne.mockResolvedValue(freshTicket());

      const result = await service.cancel('ticket-1', 'user-1');

      expect(ticketRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ statusTicket: TicketStatus.CANCELLED }),
      );
      expect(result.message).toBe('Ticket cancelado exitosamente');
    });

    it('rechaza cancelar tickets no activos', async () => {
      ticketRepository.findOne.mockResolvedValue({
        ...freshTicket(),
        statusTicket: TicketStatus.COMPLETED,
      });

      await expect(service.cancel('ticket-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lanza NotFoundException cuando el ticket no existe', async () => {
      ticketRepository.findOne.mockResolvedValue(null);

      await expect(service.cancel('ticket-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findActiveByPlate', () => {
    it('retorna el ticket activo de la placa', async () => {
      vehicleRepository.findOne.mockResolvedValue({
        idVehicle: 'vehicle-1',
      });
      ticketRepository.findOne.mockResolvedValue(freshBaseTicket());

      const result = await service.findActiveByPlate(
        { idBusiness: 'business-1', licensePlate: 'ABC19H' },
        'user-1',
      );

      expect(vehicleRepository.findOne).toHaveBeenCalledWith({
        where: {
          business: { idBusiness: 'business-1' },
          licensePlate: 'ABC19H',
        },
      });
      expect(ticketRepository.findOne).toHaveBeenCalledWith({
        where: {
          vehicle: { idVehicle: 'vehicle-1' },
          statusTicket: TicketStatus.ACTIVE,
        },
      });
      expect(result.data).toEqual(freshBaseTicket());
    });

    it('lanza NotFoundException si no hay ticket activo', async () => {
      vehicleRepository.findOne.mockResolvedValue({ idVehicle: 'vehicle-1' });
      ticketRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findActiveByPlate(
          { idBusiness: 'business-1', licensePlate: 'ABC19H' },
          'user-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('filtra tickets por business y status', async () => {
      ticketRepository.find.mockResolvedValue([freshBaseTicket()]);

      const result = await service.findAll(
        { idBusiness: 'business-1', status: TicketStatus.ACTIVE },
        'user-1',
      );

      expect(ticketRepository.find).toHaveBeenCalledWith({
        where: {
          business: { idBusiness: 'business-1' },
          statusTicket: TicketStatus.ACTIVE,
        },
        relations: { vehicle: true },
        order: { entryTime: 'DESC' },
      });
      expect(result.data).toHaveLength(1);
    });
  });

  describe('findActives', () => {
    it('lista solo los tickets activos del negocio', async () => {
      ticketRepository.find.mockResolvedValue([freshBaseTicket()]);

      const result = await service.findActives(
        { idBusiness: 'business-1' },
        'user-1',
      );

      expect(ticketRepository.find).toHaveBeenCalledWith({
        where: {
          business: { idBusiness: 'business-1' },
          statusTicket: TicketStatus.ACTIVE,
        },
        relations: { vehicle: true },
        order: { entryTime: 'DESC' },
      });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].pendingAmount).toBe(0);
      expect(result.message).toBeUndefined();
    });

    it('retorna mensaje informativo cuando no hay tickets activos', async () => {
      ticketRepository.find.mockResolvedValue([]);

      const result = await service.findActives(
        { idBusiness: 'business-1' },
        'user-1',
      );

      expect(result.data).toEqual([]);
      expect(result.message).toBe('No hay tickets activos');
    });
  });
});
