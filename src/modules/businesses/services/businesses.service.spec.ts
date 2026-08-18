import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BusinessesService } from './businesses.service';
import { BusinessValidatorService } from './business-validator.service';
import { Business, BusinessType } from '../entities/business.entity';

describe('BusinessesService', () => {
  let service: BusinessesService;
  let businessRepository: Record<string, jest.Mock>;
  let validator: BusinessValidatorService;

  const business = {
    idBusiness: 'business-1',
    nameBusiness: 'Parqueadero El Centro',
    businessType: BusinessType.PARKING,
    statusBusiness: 'ACTIVE',
    createdAt: new Date(),
    modifyAt: new Date(),
    user: { idUser: 'user-1' },
  };

  const cleanResponse = {
    idBusiness: 'business-1',
    nameBusiness: 'Parqueadero El Centro',
    businessType: BusinessType.PARKING,
  };

  beforeEach(async () => {
    businessRepository = {
      create: jest.fn().mockImplementation((value: unknown) => value),
      save: jest.fn().mockImplementation((value: { idBusiness?: string }) => ({
        ...value,
        idBusiness: value.idBusiness ?? 'business-1',
        createdAt: new Date(),
        modifyAt: new Date(),
        user: { idUser: 'user-1' },
      })),
      find: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BusinessesService,
        BusinessValidatorService,
        {
          provide: getRepositoryToken(Business),
          useValue: businessRepository,
        },
      ],
    }).compile();

    service = module.get<BusinessesService>(BusinessesService);
    validator = module.get<BusinessValidatorService>(BusinessValidatorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(validator).toBeDefined();
  });

  describe('create', () => {
    it('crea un negocio asociado al usuario autenticado', async () => {
      const dto = {
        nameBusiness: 'Parqueadero El Centro',
        businessType: BusinessType.PARKING,
      };

      const result = await service.create(dto, 'user-1');

      expect(businessRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          nameBusiness: 'Parqueadero El Centro',
          businessType: BusinessType.PARKING,
          statusBusiness: 'ACTIVE',
          user: { idUser: 'user-1' },
        }),
      );
      expect(result.data).toEqual(cleanResponse);
      expect(result.data).not.toHaveProperty('statusBusiness');
      expect(result.data).not.toHaveProperty('user');
      expect(result.message).toBe('Negocio creado exitosamente');
    });

    it('lanza ConflictException si se viola una restricción única (23505)', async () => {
      businessRepository.save.mockRejectedValue({ code: '23505' });

      await expect(
        service.create(
          { nameBusiness: 'Dup', businessType: BusinessType.RETAIL },
          'user-1',
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('retorna solo negocios activos del usuario sin campos internos', async () => {
      businessRepository.find.mockResolvedValue([business]);

      const result = await service.findAll('user-1');

      expect(businessRepository.find).toHaveBeenCalledWith({
        where: { user: { idUser: 'user-1' }, statusBusiness: 'ACTIVE' },
        order: { createdAt: 'DESC' },
      });
      expect(result.data).toEqual([cleanResponse]);
      expect(result.data[0]).not.toHaveProperty('statusBusiness');
      expect(result.data[0]).not.toHaveProperty('user');
      expect(result.data[0]).not.toHaveProperty('createdAt');
      expect(result.data[0]).not.toHaveProperty('modifyAt');
      expect(result.message).toBeUndefined();
    });

    it('retorna mensaje informativo si no hay negocios', async () => {
      businessRepository.find.mockResolvedValue([]);

      const result = await service.findAll('user-1');

      expect(result.data).toEqual([]);
      expect(result.message).toBe(
        'No se encontraron negocios para este usuario',
      );
    });
  });

  describe('findOne', () => {
    it('retorna el negocio si pertenece al usuario', async () => {
      businessRepository.findOne.mockResolvedValue(business);

      const result = await service.findOne('business-1', 'user-1');

      expect(result.data).toEqual(cleanResponse);
      expect(result.data).not.toHaveProperty('statusBusiness');
    });

    it('lanza NotFoundException si el negocio no pertenece al usuario', async () => {
      businessRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('business-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('actualiza solo el nombre del negocio', async () => {
      const current = {
        ...business,
        nameBusiness: 'Viejo nombre',
      };
      businessRepository.findOne.mockResolvedValue(current);

      const result = await service.update(
        'business-1',
        { nameBusiness: 'Parqueadero El Centro' },
        'user-1',
      );

      expect(businessRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          nameBusiness: 'Parqueadero El Centro',
          businessType: BusinessType.PARKING,
          statusBusiness: 'ACTIVE',
        }),
      );
      expect(result.data).toEqual(cleanResponse);
      expect(result.data).not.toHaveProperty('user');
      expect(result.data).not.toHaveProperty('createdAt');
      expect(result.message).toBe('Negocio actualizado exitosamente');
    });

    it('lanza ConflictException si se viola una restricción única (23505)', async () => {
      businessRepository.findOne.mockResolvedValue({ ...business });
      businessRepository.save.mockRejectedValue({ code: '23505' });

      await expect(
        service.update('business-1', { nameBusiness: 'Dup' }, 'user-1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('desactiva el negocio (soft delete)', async () => {
      businessRepository.findOne.mockResolvedValue({ ...business });

      const result = await service.remove('business-1', 'user-1');

      expect(businessRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ statusBusiness: 'INACTIVE' }),
      );
      expect(result.data).toEqual(cleanResponse);
      expect(result.data).not.toHaveProperty('statusBusiness');
      expect(result.message).toBe('Negocio desactivado exitosamente');
    });
  });
});
