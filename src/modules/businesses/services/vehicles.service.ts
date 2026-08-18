import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Business, BusinessType } from '../entities/business.entity';
import { Vehicle } from '../entities/vehicle.entity';
import { ParkingTicket } from '../entities/parking-ticket.entity';
import {
  CreateVehicleDto,
  UpdateVehicleDto,
  VehicleQueryDto,
} from '../dto/parking.dto';
import { BusinessValidatorService } from './business-validator.service';
import { normalizePlate, validatePlateFormat } from '../utils/plate.util';

interface PostgresError {
  code: string;
  detail?: string;
  message: string;
}

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>,
    @InjectRepository(ParkingTicket)
    private readonly ticketRepository: Repository<ParkingTicket>,
    private readonly validator: BusinessValidatorService,
  ) {}

  async findAll(idBusiness: string, query: VehicleQueryDto, idUser: string) {
    await this.assertParkingBusiness(idBusiness, idUser);

    if (query.licensePlate) {
      const licensePlate = normalizePlate(query.licensePlate);
      const vehicle = await this.vehicleRepository.findOne({
        where: { business: { idBusiness }, licensePlate },
      });

      return {
        data: vehicle ? this.toVehicleResponse(vehicle) : null,
        message: vehicle ? undefined : 'Vehiculo no encontrado',
      };
    }

    const vehicles = await this.vehicleRepository.find({
      where: { business: { idBusiness } },
      order: { licensePlate: 'ASC' },
    });

    return {
      data: vehicles.map((vehicle) => this.toVehicleResponse(vehicle)),
      message: vehicles.length
        ? undefined
        : 'Este negocio no tiene vehiculos registrados',
    };
  }

  async create(idBusiness: string, dto: CreateVehicleDto, idUser: string) {
    const business = await this.assertParkingBusiness(idBusiness, idUser);

    const licensePlate = normalizePlate(dto.licensePlate);
    validatePlateFormat(licensePlate, dto.vehicleType);

    const vehicle = this.vehicleRepository.create({
      licensePlate,
      vehicleType: dto.vehicleType,
      color: dto.color ?? '',
      brand: dto.brand ?? null,
      model: dto.model ?? null,
      ownerName: dto.ownerName.trim(),
      phoneOwner: dto.phoneOwner.trim(),
      emailOwner: dto.emailOwner?.trim() ?? null,
      business: { idBusiness: business.idBusiness },
    });

    try {
      const saved = await this.vehicleRepository.save(vehicle);
      return {
        data: this.toVehicleResponse(saved),
        message: 'Vehiculo registrado exitosamente',
      };
    } catch (error: unknown) {
      const dbError = error as PostgresError;
      if (dbError.code === '23505') {
        throw new ConflictException(
          'Ya existe un vehiculo con esa placa en este negocio',
        );
      }
      throw error;
    }
  }

  async update(
    idBusiness: string,
    idVehicle: string,
    dto: UpdateVehicleDto,
    idUser: string,
  ) {
    await this.assertParkingBusiness(idBusiness, idUser);

    const vehicle = await this.findOwned(idBusiness, idVehicle);

    if (dto.licensePlate !== undefined) {
      vehicle.licensePlate = normalizePlate(dto.licensePlate);
    }
    if (dto.vehicleType !== undefined) {
      vehicle.vehicleType = dto.vehicleType;
    }

    validatePlateFormat(vehicle.licensePlate, vehicle.vehicleType);

    if (dto.ownerName !== undefined) {
      vehicle.ownerName = dto.ownerName.trim();
    }
    if (dto.phoneOwner !== undefined) {
      vehicle.phoneOwner = dto.phoneOwner.trim();
    }
    if (dto.emailOwner !== undefined) {
      vehicle.emailOwner = dto.emailOwner.trim() || null;
    }
    if (dto.color !== undefined) {
      vehicle.color = dto.color;
    }
    if (dto.brand !== undefined) {
      vehicle.brand = dto.brand || null;
    }
    if (dto.model !== undefined) {
      vehicle.model = dto.model || null;
    }

    try {
      const saved = await this.vehicleRepository.save(vehicle);
      return {
        data: this.toVehicleResponse(saved),
        message: 'Vehiculo actualizado exitosamente',
      };
    } catch (error: unknown) {
      const dbError = error as PostgresError;
      if (dbError.code === '23505') {
        throw new ConflictException(
          'Ya existe un vehiculo con esa placa en este negocio',
        );
      }
      throw error;
    }
  }

  async remove(idBusiness: string, idVehicle: string, idUser: string) {
    await this.assertParkingBusiness(idBusiness, idUser);

    const vehicle = await this.findOwned(idBusiness, idVehicle);

    const ticketsCount = await this.ticketRepository.count({
      where: { vehicle: { idVehicle: vehicle.idVehicle } },
    });

    if (ticketsCount > 0) {
      throw new BadRequestException(
        'No se puede eliminar el vehiculo porque tiene tickets asociados',
      );
    }

    await this.vehicleRepository.remove(vehicle);

    return {
      data: null,
      message: 'Vehiculo eliminado exitosamente',
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

  private toVehicleResponse(vehicle: Vehicle) {
    return {
      idVehicle: vehicle.idVehicle,
      licensePlate: vehicle.licensePlate,
      vehicleType: vehicle.vehicleType,
      color: vehicle.color,
      brand: vehicle.brand,
      model: vehicle.model,
      photoUrl: vehicle.photoUrl,
      ownerName: vehicle.ownerName,
      phoneOwner: vehicle.phoneOwner,
      emailOwner: vehicle.emailOwner,
      monthlyStartDate: vehicle.monthlyStartDate,
      monthlyEndDate: vehicle.monthlyEndDate,
    };
  }

  private async findOwned(
    idBusiness: string,
    idVehicle: string,
  ): Promise<Vehicle> {
    const vehicle = await this.vehicleRepository.findOne({
      where: { idVehicle, business: { idBusiness } },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehiculo no encontrado');
    }

    return vehicle;
  }
}
