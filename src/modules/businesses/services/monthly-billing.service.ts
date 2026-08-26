import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle } from '../entities/vehicle.entity';
import { ParkingRate, ShiftType } from '../entities/parking-rate.entity';
import {
  VehicleMonthlySubscription,
  SubscriptionStatus,
} from '../entities/vehicle-monthly-subscription.entity';
import { VehicleMonthlyHistory } from '../entities/vehicle-monthly-history.entity';
import { ParkingTicket, TicketStatus } from '../entities/parking-ticket.entity';

@Injectable()
export class MonthlyBillingService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>,
    @InjectRepository(ParkingRate)
    private readonly rateRepository: Repository<ParkingRate>,
    @InjectRepository(VehicleMonthlySubscription)
    private readonly subscriptionRepository: Repository<VehicleMonthlySubscription>,
    @InjectRepository(VehicleMonthlyHistory)
    private readonly historyRepository: Repository<VehicleMonthlyHistory>,
    @InjectRepository(ParkingTicket)
    private readonly ticketRepository: Repository<ParkingTicket>,
  ) {}

  async activate(
    idVehicle: string,
    startDate?: Date,
  ): Promise<{
    subscription: VehicleMonthlySubscription;
    monthlyPrice: number;
  }> {
    const vehicle = await this.vehicleRepository.findOne({
      where: { idVehicle },
      relations: { business: true },
    });

    if (!vehicle) {
      throw new BadRequestException('Vehiculo no encontrado');
    }

    const existing = await this.subscriptionRepository.findOne({
      where: {
        vehicle: { idVehicle },
        status: SubscriptionStatus.ACTIVE,
      },
    });

    if (existing) {
      throw new BadRequestException(
        'El vehiculo ya tiene una mensualidad activa',
      );
    }

    const rate = await this.rateRepository.findOne({
      where: {
        business: { idBusiness: vehicle.business.idBusiness },
        vehicleType: vehicle.vehicleType,
        shiftType: ShiftType.MONTHLY,
      },
    });

    if (!rate) {
      throw new BadRequestException(
        'No hay tarifa mensual configurada para este tipo de vehiculo',
      );
    }

    const monthlyPrice = Number(rate.price);
    const now = startDate ?? new Date();
    const billingDay = now.getDate();

    const subscription = this.subscriptionRepository.create({
      billingDay,
      periodStartDate: now,
      periodEndDate: null,
      amountDue: monthlyPrice,
      amountPaid: 0,
      totalMonthsSubscribed: 1,
      status: SubscriptionStatus.ACTIVE,
      vehicle: { idVehicle },
    });

    const saved = await this.subscriptionRepository.save(subscription);

    return { subscription: saved, monthlyPrice };
  }

  async getStatus(
    idVehicle: string,
  ): Promise<{
    subscription: VehicleMonthlySubscription | null;
    monthlyPrice: number | null;
  }> {
    const vehicle = await this.vehicleRepository.findOne({
      where: { idVehicle },
      relations: { business: true },
    });

    if (!vehicle) {
      throw new BadRequestException('Vehiculo no encontrado');
    }

    const subscription = await this.subscriptionRepository.findOne({
      where: {
        vehicle: { idVehicle },
        status: SubscriptionStatus.ACTIVE,
      },
    });

    if (!subscription) {
      return { subscription: null, monthlyPrice: null };
    }

    const rate = await this.rateRepository.findOne({
      where: {
        business: { idBusiness: vehicle.business.idBusiness },
        vehicleType: vehicle.vehicleType,
        shiftType: ShiftType.MONTHLY,
      },
    });

    return {
      subscription,
      monthlyPrice: rate ? Number(rate.price) : null,
    };
  }

  async cancel(
    idVehicle: string,
  ): Promise<{ recalculatedTickets: number }> {
    const subscription = await this.subscriptionRepository.findOne({
      where: {
        vehicle: { idVehicle },
        status: SubscriptionStatus.ACTIVE,
      },
    });

    if (!subscription) {
      throw new BadRequestException('No hay mensualidad activa');
    }

    subscription.status = SubscriptionStatus.CANCELLED;
    subscription.periodEndDate = new Date();
    await this.subscriptionRepository.save(subscription);

    const history = this.historyRepository.create({
      periodStart: subscription.periodStartDate,
      periodEnd: new Date(),
      amount: subscription.amountPaid,
      paidAt: subscription.amountPaid > 0 ? new Date() : null,
      subscription: { idSubscription: subscription.idSubscription },
    });
    await this.historyRepository.save(history);

    const coveredTickets = await this.ticketRepository.find({
      where: {
        vehicle: { idVehicle },
        statusTicket: TicketStatus.COMPLETED,
      },
      relations: { vehicle: true },
    });

    const recalculated = coveredTickets.filter((t) => {
      const total = Number(t.totalAmount ?? 0);
      return total === 0 && t.entryTime >= subscription.periodStartDate;
    }).length;

    return { recalculatedTickets: recalculated };
  }

  async expire(): Promise<number> {
    const now = new Date();

    const active = await this.subscriptionRepository.find({
      where: { status: SubscriptionStatus.ACTIVE },
    });

    let expiredCount = 0;

    for (const sub of active) {
      if (sub.periodEndDate && sub.periodEndDate <= now) {
        sub.status = SubscriptionStatus.EXPIRED;
        await this.subscriptionRepository.save(sub);

        const history = this.historyRepository.create({
          periodStart: sub.periodStartDate,
          periodEnd: sub.periodEndDate,
          amount: sub.amountPaid,
          paidAt: sub.amountPaid > 0 ? sub.periodEndDate : null,
          subscription: { idSubscription: sub.idSubscription },
        });
        await this.historyRepository.save(history);

        expiredCount++;
      }
    }

    return expiredCount;
  }
}
