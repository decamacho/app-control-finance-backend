import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Business, BusinessType } from '../entities/business.entity';
import { ParkingTicket, TicketStatus } from '../entities/parking-ticket.entity';
import { Vehicle, VehicleType } from '../entities/vehicle.entity';
import { ParkingRate, ShiftType } from '../entities/parking-rate.entity';
import {
  ExitTicketDto,
  RegisterEntryDto,
  TicketQueryDto,
} from '../dto/parking.dto';
import { BusinessValidatorService } from './business-validator.service';
import { PricingService, RateMap } from './pricing.service';

@Injectable()
export class ParkingService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>,
    @InjectRepository(ParkingTicket)
    private readonly ticketRepository: Repository<ParkingTicket>,
    @InjectRepository(ParkingRate)
    private readonly rateRepository: Repository<ParkingRate>,
    private readonly validator: BusinessValidatorService,
    private readonly pricingService: PricingService,
  ) {}

  async registerEntry(dto: RegisterEntryDto, idUser: string) {
    const business = await this.assertParkingBusiness(dto.idBusiness, idUser);
    const licensePlate = this.normalizePlate(dto.licensePlate);

    let vehicle = await this.vehicleRepository.findOne({
      where: { business: { idBusiness: business.idBusiness }, licensePlate },
    });

    if (!vehicle) {
      if (!dto.vehicleType) {
        throw new BadRequestException(
          'vehicleType es obligatorio al registrar un vehiculo nuevo',
        );
      }

      vehicle = this.vehicleRepository.create({
        licensePlate,
        vehicleType: dto.vehicleType,
        color: dto.color ?? '',
        brand: dto.brand ?? null,
        model: dto.model ?? null,
        photoUrl: dto.photoUrl ?? null,
        business: { idBusiness: business.idBusiness },
      });
      vehicle = await this.vehicleRepository.save(vehicle);
    }

    await this.assertNoActiveTicket(vehicle.idVehicle);

    const ticket = this.ticketRepository.create({
      entryTime: new Date(),
      statusTicket: TicketStatus.ACTIVE,
      business: { idBusiness: business.idBusiness },
      vehicle: { idVehicle: vehicle.idVehicle },
    });

    const saved = await this.ticketRepository.save(ticket);

    return {
      data: saved,
      message: 'Entrada registrada correctamente',
    };
  }

  async completeExit(idTicket: string, dto: ExitTicketDto, idUser: string) {
    const ticket = await this.findOwnedTicket(idTicket, idUser);

    if (ticket.statusTicket !== TicketStatus.ACTIVE) {
      throw new BadRequestException(
        'El ticket no se encuentra activo; no es posible liquidarlo',
      );
    }

    const exitTime = dto.exitTime ?? new Date();
    if (exitTime.getTime() <= ticket.entryTime.getTime()) {
      throw new BadRequestException(
        'La salida debe ser posterior a la entrada del vehiculo',
      );
    }

    const rates = await this.getRatesForVehicle(
      ticket.business.idBusiness,
      ticket.vehicle.vehicleType,
    );

    const totalAmount = this.pricingService.calculateTotal(
      ticket.entryTime,
      exitTime,
      rates,
    );

    ticket.exitTime = exitTime;
    ticket.totalAmount = totalAmount;
    ticket.statusTicket = TicketStatus.COMPLETED;

    const saved = await this.ticketRepository.save(ticket);

    return {
      data: saved,
      message: 'Salida registrada y total liquidado',
    };
  }

  async cancel(idTicket: string, idUser: string) {
    const ticket = await this.findOwnedTicket(idTicket, idUser);

    if (ticket.statusTicket !== TicketStatus.ACTIVE) {
      throw new BadRequestException('Solo se pueden cancelar tickets activos');
    }

    ticket.statusTicket = TicketStatus.CANCELLED;
    const saved = await this.ticketRepository.save(ticket);

    return {
      data: saved,
      message: 'Ticket cancelado exitosamente',
    };
  }

  async findActiveByPlate(query: TicketQueryDto, idUser: string) {
    await this.assertParkingBusiness(query.idBusiness, idUser);

    const licensePlate = this.normalizePlate(query.licensePlate ?? '');
    const vehicle = await this.vehicleRepository.findOne({
      where: { business: { idBusiness: query.idBusiness }, licensePlate },
    });

    if (!vehicle) {
      throw new NotFoundException(
        'No se encontro un ticket activo para la placa indicada',
      );
    }

    const ticket = await this.ticketRepository.findOne({
      where: {
        vehicle: { idVehicle: vehicle.idVehicle },
        statusTicket: TicketStatus.ACTIVE,
      },
    });

    if (!ticket) {
      throw new NotFoundException(
        'No se encontro un ticket activo para la placa indicada',
      );
    }

    return {
      data: ticket,
      message: undefined,
    };
  }

  async findAll(query: TicketQueryDto, idUser: string) {
    await this.assertParkingBusiness(query.idBusiness, idUser);

    const tickets = await this.ticketRepository.find({
      where: {
        business: { idBusiness: query.idBusiness },
        statusTicket: query.status,
      },
      relations: { vehicle: true },
      order: { entryTime: 'DESC' },
    });

    return {
      data: tickets.map((ticket) => {
        const total = Number(ticket.totalAmount ?? 0);
        const paid = Number(ticket.paidAmount ?? 0);
        return {
          ...ticket,
          pendingAmount: Math.round((total - paid) * 100) / 100,
        };
      }),
      message: tickets.length ? undefined : 'No se encontraron tickets',
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

  private async findOwnedTicket(
    idTicket: string,
    idUser: string,
  ): Promise<ParkingTicket> {
    const ticket = await this.ticketRepository.findOne({
      where: { idTicket },
      relations: { business: true, vehicle: true },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket no encontrado');
    }

    await this.validator.assertBusinessOwnership(
      ticket.business.idBusiness,
      idUser,
    );

    return ticket;
  }

  private async assertNoActiveTicket(idVehicle: string): Promise<void> {
    const active = await this.ticketRepository.findOne({
      where: {
        vehicle: { idVehicle },
        statusTicket: TicketStatus.ACTIVE,
      },
    });

    if (active) {
      throw new ConflictException(
        'El vehiculo ya se encuentra dentro del parqueadero',
      );
    }
  }

  private async getRatesForVehicle(
    idBusiness: string,
    vehicleType: VehicleType,
  ): Promise<RateMap> {
    const rates = await this.rateRepository.find({
      where: { business: { idBusiness }, vehicleType },
    });

    const rateMap = {
      [ShiftType.DAY]: undefined,
      [ShiftType.NIGHT]: undefined,
      [ShiftType.HOUR]: undefined,
    } as unknown as Record<string, number | undefined>;

    for (const rate of rates) {
      rateMap[rate.shiftType] = Number(rate.price);
    }

    const missing = (Object.keys(rateMap) as ShiftType[]).filter(
      (key) => rateMap[key] === undefined,
    );

    if (missing.length > 0) {
      throw new BadRequestException(
        `No hay tarifa configurada para el tipo de vehiculo ${vehicleType} (faltan: ${missing.join(', ')})`,
      );
    }

    return rateMap as unknown as RateMap;
  }

  private normalizePlate(licensePlate: string): string {
    return licensePlate.trim().toUpperCase().replace(/\s+/g, '');
  }
}
