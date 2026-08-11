import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ParkingService } from './parking.service';
import { BusinessValidatorService } from './business-validator.service';
import { PricingService } from './pricing.service';
import { Vehicle, VehicleType } from '../entities/vehicle.entity';
import { ParkingTicket, TicketStatus } from '../entities/parking-ticket.entity';
import { ParkingRate, ShiftType } from '../entities/parking-rate.entity';
import { BusinessType } from '../entities/business.entity';

describe('ParkingService', () => {
  let service: ParkingService;
  let vehicleRepository: Record<string, jest.Mock>;
  let ticketRepository: Record<string, jest.Mock>;
  let rateRepository: Record<string, jest.Mock>;
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
      licensePlate: 'abc 123',
      vehicleType: VehicleType.MOTO,
      color: 'Rojo',
    };

    it('crea el vehiculo y el ticket de entrada con placa normalizada', async () => {
      vehicleRepository.findOne.mockResolvedValue(null);
      ticketRepository.findOne.mockResolvedValue(null);

      const result = await service.registerEntry(dto, 'user-1');

      expect(vehicleRepository.findOne).toHaveBeenCalledWith({
        where: {
          business: { idBusiness: 'business-1' },
          licensePlate: 'ABC123',
        },
      });
      expect(ticketRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          statusTicket: TicketStatus.ACTIVE,
          business: { idBusiness: 'business-1' },
          vehicle: { idVehicle: 'vehicle-1' },
        }),
      );
      expect(result.message).toBe('Entrada registrada correctamente');
    });

    it('reutiliza un vehiculo existente sin recrearlo', async () => {
      vehicleRepository.findOne.mockResolvedValue({
        idVehicle: 'vehicle-1',
        vehicleType: VehicleType.MOTO,
      });
      ticketRepository.findOne.mockResolvedValue(null);
      const saveSpy = jest.spyOn(vehicleRepository, 'save');

      await service.registerEntry(dto, 'user-1');

      expect(saveSpy).not.toHaveBeenCalled();
      expect(validator.assertBusinessType).toHaveBeenCalledWith(
        expect.objectContaining({ businessType: BusinessType.PARKING }),
        BusinessType.PARKING,
      );
    });

    it('exige vehicleType cuando el vehiculo es nuevo', async () => {
      vehicleRepository.findOne.mockResolvedValue(null);

      await expect(
        service.registerEntry({ ...dto, vehicleType: undefined }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza la entrada si el vehiculo ya tiene ticket activo', async () => {
      vehicleRepository.findOne.mockResolvedValue({
        idVehicle: 'vehicle-1',
        vehicleType: VehicleType.MOTO,
      });
      ticketRepository.findOne.mockResolvedValue({ idTicket: 'ticket-1' });

      await expect(service.registerEntry(dto, 'user-1')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('completeExit', () => {
    const freshTicket = () => freshBaseTicket();

    it('liquida el total y completa el ticket', async () => {
      ticketRepository.findOne.mockResolvedValue(freshTicket());
      rateRepository.find.mockResolvedValue([
        { shiftType: ShiftType.DAY, price: '6000' },
        { shiftType: ShiftType.NIGHT, price: '6000' },
        { shiftType: ShiftType.HOUR, price: '1000' },
      ]);

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
        { idBusiness: 'business-1', licensePlate: 'ABC123' },
        'user-1',
      );

      expect(vehicleRepository.findOne).toHaveBeenCalledWith({
        where: {
          business: { idBusiness: 'business-1' },
          licensePlate: 'ABC123',
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
          { idBusiness: 'business-1', licensePlate: 'ABC123' },
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
});
