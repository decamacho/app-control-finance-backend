import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ParkingRatesService } from './parking-rates.service';
import { BusinessValidatorService } from './business-validator.service';
import { ParkingRate, ShiftType } from '../entities/parking-rate.entity';
import { VehicleType } from '../entities/vehicle.entity';
import { BusinessType } from '../entities/business.entity';

describe('ParkingRatesService', () => {
  let service: ParkingRatesService;
  let rateRepository: Record<string, jest.Mock>;
  let validator: Record<string, jest.Mock>;

  const ratesDto = () => ({
    MOTO: { DAY: 5000, NIGHT: 5000, HOUR: 1000, MONTHLY: 70000 },
    CARRO: { DAY: 6000, NIGHT: 6000, HOUR: 2000, MONTHLY: 90000 },
    CAMIONETA: { DAY: 8000, NIGHT: 9000, HOUR: 3000, MONTHLY: 110000 },
  });

  beforeEach(async () => {
    rateRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((value: unknown) => value),
      save: jest.fn().mockImplementation((value: unknown) => value),
      remove: jest.fn(),
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
        ParkingRatesService,
        { provide: getRepositoryToken(ParkingRate), useValue: rateRepository },
        { provide: BusinessValidatorService, useValue: validator },
      ],
    }).compile();

    service = module.get<ParkingRatesService>(ParkingRatesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('upsert', () => {
    it('crea las 12 tarifas cuando el negocio no tiene ninguna', async () => {
      rateRepository.find.mockResolvedValue([]);

      const result = await service.upsert('business-1', ratesDto(), 'user-1');

      expect(rateRepository.create).toHaveBeenCalledTimes(12);
      expect(rateRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          vehicleType: VehicleType.MOTO,
          shiftType: ShiftType.DAY,
          price: 5000,
          business: { idBusiness: 'business-1' },
        }),
      );
      expect(rateRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          vehicleType: VehicleType.CAMIONETA,
          shiftType: ShiftType.MONTHLY,
          price: 110000,
        }),
      );
      expect(rateRepository.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ shiftType: ShiftType.HOUR }),
        ]),
      );
      expect(result.data).toHaveLength(12);
      expect(result.message).toBe('Tarifas configuradas exitosamente');
    });

    it('actualiza las tarifas existentes en vez de duplicarlas (upsert)', async () => {
      rateRepository.find.mockResolvedValue([
        {
          idRate: 'rate-1',
          vehicleType: VehicleType.MOTO,
          shiftType: ShiftType.DAY,
          price: '4000',
        },
        {
          idRate: 'rate-2',
          vehicleType: VehicleType.CARRO,
          shiftType: ShiftType.NIGHT,
          price: '5000',
        },
      ]);

      const result = await service.upsert('business-1', ratesDto(), 'user-1');

      expect(rateRepository.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ idRate: 'rate-1', price: 5000 }),
          expect.objectContaining({ idRate: 'rate-2', price: 6000 }),
        ]),
      );
      expect(result.data).toHaveLength(12);
      expect(
        result.data.filter((rate) => rate.idRate === 'rate-1'),
      ).toHaveLength(1);
    });

    it('es idempotente: reenviar el mismo body no falla', async () => {
      rateRepository.find.mockResolvedValue([]);

      const first = await service.upsert('business-1', ratesDto(), 'user-1');
      expect(first.data).toHaveLength(12);

      rateRepository.find.mockResolvedValue(
        first.data.map((rate, index) => ({
          ...rate,
          idRate: `rate-${index}`,
        })),
      );

      const result = await service.upsert('business-1', ratesDto(), 'user-1');

      expect(rateRepository.create).toHaveBeenCalledTimes(12);
      expect(result.data).toHaveLength(12);
      expect(result.message).toBe('Tarifas configuradas exitosamente');
    });

    it('rechaza el body si falta algun tipo de vehiculo', async () => {
      await expect(
        service.upsert('business-1', { MOTO: ratesDto().MOTO }, 'user-1'),
      ).rejects.toThrow('faltan: CARRO, CAMIONETA');
    });

    it('rechaza el body con tipos de vehiculo desconocidos', async () => {
      await expect(
        service.upsert(
          'business-1',
          {
            ...ratesDto(),
            BICICLETA: {
              DAY: 1000,
              NIGHT: 1000,
              HOUR: 500,
              MONTHLY: 20000,
            },
          },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('lista las tarifas sin el objeto business', async () => {
      rateRepository.find.mockResolvedValue([
        {
          idRate: 'rate-1',
          price: '6000',
          vehicleType: VehicleType.CARRO,
          shiftType: ShiftType.DAY,
          business: { idBusiness: 'business-1' },
        },
      ]);

      const result = await service.findAll('business-1', 'user-1');

      expect(rateRepository.find).toHaveBeenCalledWith({
        where: { business: { idBusiness: 'business-1' } },
        order: { vehicleType: 'ASC', shiftType: 'ASC' },
      });
      expect(result.data).toEqual([
        {
          idRate: 'rate-1',
          price: '6000',
          vehicleType: VehicleType.CARRO,
          shiftType: ShiftType.DAY,
        },
      ]);
      expect(result.data[0]).not.toHaveProperty('business');
    });

    it('retorna mensaje informativo si no hay tarifas', async () => {
      rateRepository.find.mockResolvedValue([]);

      const result = await service.findAll('business-1', 'user-1');

      expect(result.data).toEqual([]);
      expect(result.message).toBe('Este negocio no tiene tarifas configuradas');
    });
  });

  describe('update', () => {
    it('actualiza el precio de una tarifa sin exponer business', async () => {
      rateRepository.findOne.mockResolvedValue({
        idRate: 'rate-1',
        price: '6000',
        vehicleType: VehicleType.CARRO,
        shiftType: ShiftType.DAY,
      });

      const result = await service.update(
        'business-1',
        'rate-1',
        { price: 7500 },
        'user-1',
      );

      expect(rateRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ price: 7500 }),
      );
      expect(result.data).toEqual({
        idRate: 'rate-1',
        price: 7500,
        vehicleType: VehicleType.CARRO,
        shiftType: ShiftType.DAY,
      });
      expect(result.data).not.toHaveProperty('business');
      expect(result.message).toBe('Tarifa actualizada exitosamente');
    });

    it('lanza ConflictException si la combinacion ya existe', async () => {
      rateRepository.findOne.mockResolvedValueOnce({
        idRate: 'rate-1',
        price: '6000',
        vehicleType: VehicleType.CARRO,
        shiftType: ShiftType.DAY,
      });
      rateRepository.findOne.mockResolvedValueOnce({
        idRate: 'rate-2',
        price: '5000',
        vehicleType: VehicleType.MOTO,
        shiftType: ShiftType.DAY,
      });

      await expect(
        service.update(
          'business-1',
          'rate-1',
          { vehicleType: VehicleType.MOTO },
          'user-1',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('lanza NotFoundException si la tarifa no existe', async () => {
      rateRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('business-1', 'rate-9', { price: 1000 }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('elimina la tarifa por id', async () => {
      rateRepository.findOne.mockResolvedValue({
        idRate: 'rate-1',
        price: '6000',
        vehicleType: VehicleType.CARRO,
        shiftType: ShiftType.DAY,
      });

      const result = await service.remove('business-1', 'rate-1', 'user-1');

      expect(rateRepository.remove).toHaveBeenCalled();
      expect(result.data).toBeNull();
      expect(result.message).toBe('Tarifa eliminada exitosamente');
    });

    it('lanza NotFoundException si la tarifa no existe', async () => {
      rateRepository.findOne.mockResolvedValue(null);

      await expect(
        service.remove('business-1', 'rate-9', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
