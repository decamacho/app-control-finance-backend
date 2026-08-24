import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Business, BusinessType } from '../entities/business.entity';
import { ParkingTicket, TicketStatus } from '../entities/parking-ticket.entity';
import { Vehicle, VehicleType } from '../entities/vehicle.entity';
import { ParkingRate, ShiftType } from '../entities/parking-rate.entity';
import { Payment } from '../entities/payment.entity';
import {
  ExitTicketDto,
  MonthlyActivationDto,
  RegisterEntryDto,
  TicketQueryDto,
} from '../dto/parking.dto';
import { BusinessValidatorService } from './business-validator.service';
import { PricingService, RateMap } from './pricing.service';
import { PaymentStatus, PaymentMethod } from '../types/payment.enum';
import { normalizePlate, validatePlateFormat } from '../utils/plate.util';

@Injectable()
export class ParkingService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>,
    @InjectRepository(ParkingTicket)
    private readonly ticketRepository: Repository<ParkingTicket>,
    @InjectRepository(ParkingRate)
    private readonly rateRepository: Repository<ParkingRate>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly validator: BusinessValidatorService,
    private readonly pricingService: PricingService,
  ) {}

  async registerEntry(dto: RegisterEntryDto, idUser: string) {
    const business = await this.assertParkingBusiness(dto.idBusiness, idUser);
    const licensePlate = normalizePlate(dto.licensePlate);

    const vehicle = await this.vehicleRepository.findOne({
      where: { business: { idBusiness: business.idBusiness }, licensePlate },
    });

    if (!vehicle) {
      throw new BadRequestException('El vehiculo no esta registrado');
    }

    validatePlateFormat(licensePlate, vehicle.vehicleType);

    if (this.hasActiveMonthly(vehicle)) {
      throw new BadRequestException(
        'El vehiculo tiene una mensualidad activa; debe cancelarla',
      );
    }

    const activeTicket = await this.findActiveTicket(vehicle.idVehicle);

    if (activeTicket) {
      const exitTime = new Date();
      this.requireExitAfterEntry(activeTicket, exitTime);
      const settled = await this.settleTicket(activeTicket, exitTime);

      return {
        data: settled,
        message: 'Salida registrada correctamente',
      };
    }

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

    if (this.hasActiveMonthly(ticket.vehicle)) {
      throw new BadRequestException(
        'El vehiculo tiene una mensualidad activa; debe cancelarla',
      );
    }

    if (ticket.statusTicket !== TicketStatus.ACTIVE) {
      throw new BadRequestException(
        'El ticket no se encuentra activo; no es posible liquidarlo',
      );
    }

    const exitTime = dto.exitTime ?? new Date();
    this.requireExitAfterEntry(ticket, exitTime);

    const saved = await this.settleTicket(ticket, exitTime);

    return {
      data: saved,
      message: 'Salida registrada y total liquidado',
    };
  }

  async registerMonthly(
    idTicket: string,
    dto: MonthlyActivationDto,
    idUser: string,
  ) {
    const ticket = await this.findOwnedTicket(idTicket, idUser);

    if (ticket.statusTicket !== TicketStatus.ACTIVE) {
      throw new BadRequestException(
        'Solo se puede activar la mensualidad con un ticket activo',
      );
    }

    const monthlyRate = await this.rateRepository.findOne({
      where: {
        business: { idBusiness: ticket.business.idBusiness },
        vehicleType: ticket.vehicle.vehicleType,
        shiftType: ShiftType.MONTHLY,
      },
    });

    if (!monthlyRate) {
      throw new BadRequestException(
        'No hay tarifa mensual configurada para este tipo de vehiculo',
      );
    }

    const vehicle = ticket.vehicle;
    vehicle.monthlyStartDate = dto.startDate ?? new Date();
    vehicle.monthlyEndDate = null;
    await this.vehicleRepository.save(vehicle);

    const monthlyPrice = Number(monthlyRate.price);

    if (dto.payments) {
      const totalPaid = dto.payments.reduce(
        (sum, payment) => sum + payment.amount,
        0,
      );
      if (totalPaid > monthlyPrice) {
        throw new BadRequestException(
          'El pago supera el valor de la mensualidad',
        );
      }
    }

    const payments: { amount: number; paymentMethod: PaymentMethod | null }[] =
      dto.payments ?? [{ amount: 0, paymentMethod: null }];
    const savedPayments = await this.paymentRepository.save(
      payments.map((payment) =>
        this.paymentRepository.create({
          amount: payment.amount,
          paymentMethod: payment.paymentMethod,
          ticket: { idTicket },
        }),
      ),
    );

    return {
      data: {
        payments: savedPayments,
        vehicle,
        monthlyPrice,
      },
      message: 'Mensualidad activada correctamente',
    };
  }

  async cancelMonthly(idTicket: string, idUser: string) {
    const ticket = await this.findOwnedTicket(idTicket, idUser);
    const vehicle = ticket.vehicle;

    if (!vehicle.monthlyStartDate) {
      throw new BadRequestException('El vehiculo no tiene mensualidad activa');
    }
    if (vehicle.monthlyEndDate) {
      throw new BadRequestException(
        'La mensualidad ya no se encuentra vigente',
      );
    }

    const endDate = new Date();
    vehicle.monthlyEndDate = endDate;
    await this.vehicleRepository.save(vehicle);

    const tickets = await this.ticketRepository.find({
      where: {
        vehicle: { idVehicle: vehicle.idVehicle },
        statusTicket: TicketStatus.COMPLETED,
      },
      relations: { business: true },
    });

    let recalculated = 0;
    for (const t of tickets) {
      const total = Number(t.totalAmount ?? 0);
      const isCovered = total === 0 && t.entryTime >= vehicle.monthlyStartDate;
      if (!isCovered) {
        continue;
      }

      const rates = await this.getRatesForVehicle(
        t.business.idBusiness,
        vehicle.vehicleType,
      );
      const newTotal =
        t.exitTime && t.exitTime.getTime() > t.entryTime.getTime()
          ? this.pricingService.calculateTotal(t.entryTime, t.exitTime, rates)
          : 0;

      t.totalAmount = newTotal;
      t.paymentStatus =
        newTotal === 0
          ? PaymentStatus.PAID
          : Number(t.paidAmount) > 0
            ? PaymentStatus.PARTIAL
            : PaymentStatus.PENDING;
      await this.ticketRepository.save(t);
      recalculated++;
    }

    return {
      data: { vehicle, recalculatedTickets: recalculated },
      message: 'Mensualidad cancelada y dias liquidados',
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

    const licensePlate = normalizePlate(query.licensePlate ?? '');
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

  async findOne(idTicket: string, idUser: string) {
    const ticket = await this.findOwnedTicket(idTicket, idUser);

    return {
      data: this.withPendingAmount([ticket])[0],
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
      data: this.withPendingAmount(tickets),
      message: tickets.length ? undefined : 'No se encontraron tickets',
    };
  }

  async findActives(query: TicketQueryDto, idUser: string) {
    await this.assertParkingBusiness(query.idBusiness, idUser);

    const tickets = await this.ticketRepository.find({
      where: {
        business: { idBusiness: query.idBusiness },
        statusTicket: TicketStatus.ACTIVE,
      },
      relations: { vehicle: true },
      order: { entryTime: 'DESC' },
    });

    return {
      data: this.withPendingAmount(tickets),
      message: tickets.length ? undefined : 'No hay tickets activos',
    };
  }

  private withPendingAmount(tickets: ParkingTicket[]) {
    return tickets.map((ticket) => {
      const total = Number(ticket.totalAmount ?? 0);
      const paid = Number(ticket.paidAmount ?? 0);
      return {
        ...ticket,
        pendingAmount: Math.round((total - paid) * 100) / 100,
      };
    });
  }

  private async settleTicket(ticket: ParkingTicket, exitTime: Date) {
    const coveredByMonthly = this.isCoveredByMonthly(ticket);
    const totalAmount = coveredByMonthly
      ? 0
      : this.pricingService.calculateTotal(
          ticket.entryTime,
          exitTime,
          await this.getRatesForVehicle(
            ticket.business.idBusiness,
            ticket.vehicle.vehicleType,
          ),
        );

    ticket.exitTime = exitTime;
    ticket.totalAmount = totalAmount;
    ticket.statusTicket = TicketStatus.COMPLETED;

    if (coveredByMonthly) {
      ticket.paidAmount = 0;
      ticket.paymentStatus = PaymentStatus.PAID;
    }

    return this.ticketRepository.save(ticket);
  }

  private isCoveredByMonthly(ticket: ParkingTicket): boolean {
    const vehicle = ticket.vehicle;
    if (!vehicle.monthlyStartDate) {
      return false;
    }
    if (ticket.entryTime < vehicle.monthlyStartDate) {
      return false;
    }
    if (vehicle.monthlyEndDate && ticket.entryTime > vehicle.monthlyEndDate) {
      return false;
    }
    return true;
  }

  private hasActiveMonthly(vehicle: Vehicle): boolean {
    return !!vehicle.monthlyStartDate && !vehicle.monthlyEndDate;
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

  private async findActiveTicket(
    idVehicle: string,
  ): Promise<ParkingTicket | null> {
    return this.ticketRepository.findOne({
      where: {
        vehicle: { idVehicle },
        statusTicket: TicketStatus.ACTIVE,
      },
      relations: { business: true, vehicle: true },
    });
  }

  private requireExitAfterEntry(ticket: ParkingTicket, exitTime: Date): void {
    if (exitTime.getTime() <= ticket.entryTime.getTime()) {
      throw new BadRequestException(
        'La salida debe ser posterior a la entrada del vehiculo',
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
    } as Record<
      ShiftType.DAY | ShiftType.NIGHT | ShiftType.HOUR,
      number | undefined
    >;

    for (const rate of rates) {
      if (rate.shiftType in rateMap) {
        rateMap[
          rate.shiftType as ShiftType.DAY | ShiftType.NIGHT | ShiftType.HOUR
        ] = Number(rate.price);
      }
    }

    const missing = (
      Object.keys(rateMap) as (
        | ShiftType.DAY
        | ShiftType.NIGHT
        | ShiftType.HOUR
      )[]
    ).filter((key) => rateMap[key] === undefined);

    if (missing.length > 0) {
      throw new BadRequestException(
        `No hay tarifa configurada para el tipo de vehiculo ${vehicleType} (faltan: ${missing.join(', ')})`,
      );
    }

    return rateMap as unknown as RateMap;
  }
}
