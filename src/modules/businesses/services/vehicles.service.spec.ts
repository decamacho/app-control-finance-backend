import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { VehiclesService } from './vehicles.service';
import { BusinessValidatorService } from './business-validator.service';
import { Vehicle, VehicleType } from '../entities/vehicle.entity';
import { ParkingTicket } from '../entities/parking-ticket.entity';
import { BusinessType } from '../entities/business.entity';
import { CreateVehicleDto } from '../dto/parking.dto';

describe('VehiclesService', () => {
  let service: VehiclesService;
  let vehicleRepository: Record<string, jest.Mock>;
  let ticketRepository: Record<string, jest.Mock>;
  let validator: Record<string, jest.Mock>;

  const baseVehicle = () => ({
    idVehicle: 'vehicle-1',
    licensePlate: 'ABC123',
    vehicleType: VehicleType.CARRO,
    color: 'Negro',
    brand: 'Toyota',
    model: 'Corolla',
    ownerName: 'Juan Perez',
    phoneOwner: '3001234567',
    emailOwner: null,
    business: { idBusiness: 'business-1' },
  });

  const createDto = () => ({
    licensePlate: 'abc 123',
    vehicleType: VehicleType.CARRO,
    ownerName: 'Juan Perez',
    phoneOwner: '3001234567',
    color: 'Negro',
    brand: 'Toyota',
    model: 'Corolla',
  });

  beforeEach(async () => {
    vehicleRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn().mockImplementation((value: unknown) => value),
      save: jest.fn().mockImplementation((value: { idVehicle?: string }) => ({
        ...value,
        idVehicle: value.idVehicle ?? 'vehicle-1',
      })),
      remove: jest.fn(),
    };
    ticketRepository = {
      count: jest.fn().mockResolvedValue(0),
    };
    validator = {
      assertBusinessOwnership: jest.fn().mockResolvedValue({
        idBusiness: 'business-1',
        businessType: BusinessType.PARKING,
      }),
      assertBusinessType: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehiclesService,
        { provide: getRepositoryToken(Vehicle), useValue: vehicleRepository },
        {
          provide: getRepositoryToken(ParkingTicket),
          useValue: ticketRepository,
        },
        { provide: BusinessValidatorService, useValue: validator },
      ],
    }).compile();

    service = module.get<VehiclesService>(VehiclesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('DTO: campos obligatorios', () => {
    it('exige ownerName y phoneOwner al crear un vehiculo', async () => {
      const dto = plainToInstance(CreateVehicleDto, {
        licensePlate: 'ABC123',
        vehicleType: VehicleType.CARRO,
      });

      const errors = await validate(dto);

      expect(errors.map((error) => error.property)).toEqual(
        expect.arrayContaining(['ownerName', 'phoneOwner']),
      );
    });
  });

  describe('create', () => {
    it('registra el vehiculo normalizando la placa', async () => {
      const result = await service.create('business-1', createDto(), 'user-1');

      expect(vehicleRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          licensePlate: 'ABC123',
          ownerName: 'Juan Perez',
          phoneOwner: '3001234567',
          business: { idBusiness: 'business-1' },
        }),
      );
      expect(result.data).toEqual(
        expect.objectContaining({ licensePlate: 'ABC123' }),
      );
      expect(result.data).not.toHaveProperty('business');
      expect(result.message).toBe('Vehiculo registrado exitosamente');
    });

    it('rechaza una placa con formato incorrecto para el tipo', async () => {
      await expect(
        service.create(
          'business-1',
          { ...createDto(), licensePlate: 'abc' },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza una placa de MOTO invalida (no cumple 3L2N1L)', async () => {
      await expect(
        service.create(
          'business-1',
          {
            ...createDto(),
            vehicleType: VehicleType.MOTO,
            licensePlate: 'ABC123',
          },
          'user-1',
        ),
      ).rejects.toThrow('no es valida para MOTO');
    });

    it('lanza ConflictException si la placa ya existe en el negocio', async () => {
      vehicleRepository.save.mockRejectedValue({ code: '23505' });

      await expect(
        service.create('business-1', createDto(), 'user-1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('lista los vehiculos del negocio sin el objeto business', async () => {
      vehicleRepository.find.mockResolvedValue([baseVehicle()]);

      const result = await service.findAll('business-1', {}, 'user-1');

      expect(vehicleRepository.find).toHaveBeenCalledWith({
        where: { business: { idBusiness: 'business-1' } },
        order: { licensePlate: 'ASC' },
      });
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual(
        expect.objectContaining({
          idVehicle: 'vehicle-1',
          licensePlate: 'ABC123',
        }),
      );
      expect(result.data[0]).not.toHaveProperty('business');
      expect(result.message).toBeUndefined();
    });

    it('consulta por placa devuelve un solo vehiculo, no un array', async () => {
      vehicleRepository.findOne.mockResolvedValue(baseVehicle());

      const result = await service.findAll(
        'business-1',
        { licensePlate: 'abc-123' },
        'user-1',
      );

      expect(vehicleRepository.findOne).toHaveBeenCalledWith({
        where: {
          business: { idBusiness: 'business-1' },
          licensePlate: 'ABC123',
        },
      });
      expect(Array.isArray(result.data)).toBe(false);
      expect(result.data).toEqual(
        expect.objectContaining({ licensePlate: 'ABC123' }),
      );
      expect(result.data).not.toHaveProperty('business');
      expect(result.message).toBeUndefined();
    });

    it('retorna null y mensaje si la placa no esta registrada', async () => {
      vehicleRepository.findOne.mockResolvedValue(null);

      const result = await service.findAll(
        'business-1',
        { licensePlate: 'ABC999' },
        'user-1',
      );

      expect(result.data).toBeNull();
      expect(result.message).toBe('Vehiculo no encontrado');
    });
  });

  describe('update', () => {
    it('actualiza datos del vehiculo y revalida la placa', async () => {
      vehicleRepository.findOne.mockResolvedValue(baseVehicle());

      const result = await service.update(
        'business-1',
        'vehicle-1',
        { licensePlate: 'abc 124' },
        'user-1',
      );

      expect(vehicleRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ licensePlate: 'ABC124' }),
      );
      expect(result.message).toBe('Vehiculo actualizado exitosamente');
    });

    it('revalida la placa si cambia el tipo de vehiculo', async () => {
      vehicleRepository.findOne.mockResolvedValue(baseVehicle());

      await expect(
        service.update(
          'business-1',
          'vehicle-1',
          { vehicleType: VehicleType.MOTO },
          'user-1',
        ),
      ).rejects.toThrow('no es valida para MOTO');
    });

    it('lanza NotFoundException si el vehiculo no pertenece al negocio', async () => {
      vehicleRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('business-1', 'vehicle-9', { brand: 'Mazda' }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza ConflictException si la placa nueva ya existe', async () => {
      vehicleRepository.findOne.mockResolvedValue(baseVehicle());
      vehicleRepository.save.mockRejectedValue({ code: '23505' });

      await expect(
        service.update(
          'business-1',
          'vehicle-1',
          { licensePlate: 'ABC999' },
          'user-1',
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('elimina el vehiculo si no tiene tickets', async () => {
      vehicleRepository.findOne.mockResolvedValue(baseVehicle());
      ticketRepository.count.mockResolvedValue(0);

      const result = await service.remove('business-1', 'vehicle-1', 'user-1');

      expect(ticketRepository.count).toHaveBeenCalledWith({
        where: { vehicle: { idVehicle: 'vehicle-1' } },
      });
      expect(vehicleRepository.remove).toHaveBeenCalled();
      expect(result.data).toBeNull();
      expect(result.message).toBe('Vehiculo eliminado exitosamente');
    });

    it('rechaza eliminar un vehiculo con tickets asociados', async () => {
      vehicleRepository.findOne.mockResolvedValue(baseVehicle());
      ticketRepository.count.mockResolvedValue(3);

      await expect(
        service.remove('business-1', 'vehicle-1', 'user-1'),
      ).rejects.toThrow('tiene tickets asociados');
    });

    it('lanza NotFoundException si el vehiculo no existe', async () => {
      vehicleRepository.findOne.mockResolvedValue(null);

      await expect(
        service.remove('business-1', 'vehicle-9', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
