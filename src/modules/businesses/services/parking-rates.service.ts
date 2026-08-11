import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ParkingRate } from '../entities/parking-rate.entity';
import { Business, BusinessType } from '../entities/business.entity';
import { CreateRateDto, UpdateRateDto } from '../dto/parking.dto';
import { BusinessValidatorService } from './business-validator.service';

interface PostgresError {
  code: string;
  detail?: string;
  message: string;
}

@Injectable()
export class ParkingRatesService {
  constructor(
    @InjectRepository(ParkingRate)
    private readonly rateRepository: Repository<ParkingRate>,
    private readonly validator: BusinessValidatorService,
  ) {}

  async findAll(idBusiness: string, idUser: string) {
    await this.validator.assertBusinessOwnership(idBusiness, idUser);

    const rates = await this.rateRepository.find({
      where: { business: { idBusiness } },
      order: { vehicleType: 'ASC', shiftType: 'ASC' },
    });

    return {
      data: rates,
      message: rates.length
        ? undefined
        : 'Este negocio no tiene tarifas configuradas',
    };
  }

  async create(idBusiness: string, dto: CreateRateDto, idUser: string) {
    const business = await this.assertParkingBusiness(idBusiness, idUser);
    await this.assertNoDuplicate(idBusiness, dto.vehicleType, dto.shiftType);

    const rate = this.rateRepository.create({
      price: dto.price,
      vehicleType: dto.vehicleType,
      shiftType: dto.shiftType,
      business: { idBusiness: business.idBusiness },
    });

    try {
      const saved = await this.rateRepository.save(rate);
      return {
        data: saved,
        message: 'Tarifa creada exitosamente',
      };
    } catch (error: unknown) {
      const dbError = error as PostgresError;
      if (dbError.code === '23505') {
        throw new ConflictException(
          'Ya existe una tarifa para esa combinacion de vehiculo y franja',
        );
      }
      throw error;
    }
  }

  async update(
    idBusiness: string,
    idRate: string,
    dto: UpdateRateDto,
    idUser: string,
  ) {
    await this.assertParkingBusiness(idBusiness, idUser);

    const rate = await this.rateRepository.findOne({
      where: { idRate, business: { idBusiness } },
    });

    if (!rate) {
      throw new NotFoundException('Tarifa no encontrada');
    }

    if (dto.price !== undefined) {
      rate.price = dto.price;
    }
    if (dto.vehicleType !== undefined && dto.vehicleType !== rate.vehicleType) {
      await this.assertNoDuplicate(idBusiness, dto.vehicleType, rate.shiftType);
      rate.vehicleType = dto.vehicleType;
    }
    if (dto.shiftType !== undefined && dto.shiftType !== rate.shiftType) {
      await this.assertNoDuplicate(idBusiness, rate.vehicleType, dto.shiftType);
      rate.shiftType = dto.shiftType;
    }

    try {
      const saved = await this.rateRepository.save(rate);
      return {
        data: saved,
        message: 'Tarifa actualizada exitosamente',
      };
    } catch (error: unknown) {
      const dbError = error as PostgresError;
      if (dbError.code === '23505') {
        throw new ConflictException(
          'Ya existe una tarifa para esa combinacion de vehiculo y franja',
        );
      }
      throw error;
    }
  }

  async remove(idBusiness: string, idRate: string, idUser: string) {
    await this.assertParkingBusiness(idBusiness, idUser);

    const rate = await this.rateRepository.findOne({
      where: { idRate, business: { idBusiness } },
    });

    if (!rate) {
      throw new NotFoundException('Tarifa no encontrada');
    }

    await this.rateRepository.remove(rate);

    return {
      data: null,
      message: 'Tarifa eliminada exitosamente',
    };
  }

  private async assertParkingBusiness(
    idBusiness: string,
    idUser: string,
  ): Promise<Business> {
    const business = await this.validator.assertBusinessOwnership(
      idBusiness,
      idUser,
    );
    this.validator.assertBusinessType(business, BusinessType.PARKING);
    return business;
  }

  private async assertNoDuplicate(
    idBusiness: string,
    vehicleType: CreateRateDto['vehicleType'],
    shiftType: CreateRateDto['shiftType'],
  ): Promise<void> {
    const existing = await this.rateRepository.findOne({
      where: { business: { idBusiness }, vehicleType, shiftType },
    });

    if (existing) {
      throw new ConflictException(
        'Ya existe una tarifa para esa combinacion de vehiculo y franja',
      );
    }
  }
}
