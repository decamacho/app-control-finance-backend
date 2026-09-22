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
import { MonthlyBillingService } from './monthly-billing.service';
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
    private readonly monthlyBillingService: MonthlyBillingService,
  ) {}

  async registerEntry(dto: RegisterEntryDto, idUser: string) {
    const business = await this.assertParkingBusiness(dto.idBusiness, idUser);
    const licensePlate = normalizePlate(dto.licensePlate);
    const entryTime = dto.customTime ?? new Date();

    const vehicle = await this.vehicleRepository.findOne({
      where: { business: { idBusiness: business.idBusiness }, licensePlate },
    });

    if (!vehicle) {
      throw new BadRequestException('El vehiculo no esta registrado');
    }

    validatePlateFormat(licensePlate, vehicle.vehicleType);

    const { subscription } = await this.monthlyBillingService.getStatus(
      vehicle.idVehicle,
    );

    if (subscription) {
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
      entryTime,
      statusTicket: TicketStatus.ACTIVE,
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

    const { subscription } = await this.monthlyBillingService.getStatus(
      ticket.vehicle.idVehicle,
    );

    if (subscription) {
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

    const { subscription, monthlyPrice } =
      await this.monthlyBillingService.activate(
        ticket.vehicle.idVehicle,
        dto.startDate,
      );

    if (dto.payments && monthlyPrice) {
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
        subscription,
        monthlyPrice,
      },
      message: 'Mensualidad activada correctamente',
    };
  }

  async cancelMonthly(idTicket: string, idUser: string) {
    const ticket = await this.findOwnedTicket(idTicket, idUser);

    const { recalculatedTickets } = await this.monthlyBillingService.cancel(
      ticket.vehicle.idVehicle,
    );

    return {
      data: { recalculatedTickets },
      message: 'Mensualidad cancelada y dias liquidados',
    };
  }

  async getMonthlyStatus(idTicket: string, idUser: string) {
    const ticket = await this.findOwnedTicket(idTicket, idUser);

    const status = await this.monthlyBillingService.getStatus(
      ticket.vehicle.idVehicle,
    );

    return {
      data: status,
      message: undefined,
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
        vehicle: { business: { idBusiness: query.idBusiness } },
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
        vehicle: { business: { idBusiness: query.idBusiness } },
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
    const totalAmount = this.pricingService.calculateTotal(
      ticket.entryTime,
      exitTime,
      await this.getRatesForVehicle(
        ticket.vehicle.business.idBusiness,
        ticket.vehicle.vehicleType,
      ),
    );

    ticket.exitTime = exitTime;
    ticket.totalAmount = totalAmount;
    ticket.statusTicket = TicketStatus.COMPLETED;

    return this.ticketRepository.save(ticket);
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
      relations: { vehicle: { business: true } },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket no encontrado');
    }

    await this.validator.assertBusinessOwnership(
      ticket.vehicle.business.idBusiness,
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
      relations: { vehicle: { business: true } },
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
