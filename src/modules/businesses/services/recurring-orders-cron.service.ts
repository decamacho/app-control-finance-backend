import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecurringOrder } from '../entities/recurring-order.entity';
import {
  BusinessOrder,
  OrderStatus,
} from '../entities/business-order.entity';
import { PaymentStatus } from '../types/payment.enum';

@Injectable()
export class RecurringOrdersCronService {
  private readonly logger = new Logger(RecurringOrdersCronService.name);

  constructor(
    @InjectRepository(RecurringOrder)
    private readonly recurringOrderRepository: Repository<RecurringOrder>,
    @InjectRepository(BusinessOrder)
    private readonly orderRepository: Repository<BusinessOrder>,
  ) {}

  @Cron('0 18 * * *', { timeZone: 'America/Bogota' })
  async generateDailyOrders() {
    this.logger.log('Generando pedidos recurrentes del dia siguiente...');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const recurringOrders = await this.recurringOrderRepository.find({
      where: {
        isActive: true,
        nextDeliveryDate: tomorrow,
      },
      relations: { customer: true },
    });

    let generated = 0;

    for (const recurring of recurringOrders) {
      const deliveryTime = new Date(tomorrow);
      deliveryTime.setHours(12, 0, 0, 0);

      const order = this.orderRepository.create({
        deliveryTime,
        totalAmount: recurring.totalAmount,
        paidAmount: 0,
        paymentStatus: PaymentStatus.PENDING,
        statusOrder: OrderStatus.ACTIVE,
        customer: { idCustomer: recurring.customer.idCustomer },
        recurringOrder: { idRecurringOrder: recurring.idRecurringOrder },
      });

      await this.orderRepository.save(order);

      recurring.nextDeliveryDate = this.calculateNextDate(
        recurring.frequency,
        tomorrow,
      );
      await this.recurringOrderRepository.save(recurring);

      generated++;
    }

    this.logger.log(`${generated} pedidos recurrentes generados`);
  }

  private calculateNextDate(frequency: string, from: Date): Date {
    const next = new Date(from);

    switch (frequency) {
      case 'DAILY':
        next.setDate(next.getDate() + 1);
        break;
      case 'WEEKLY':
        next.setDate(next.getDate() + 7);
        break;
      case 'BIWEEKLY':
        next.setDate(next.getDate() + 14);
        break;
      case 'MONTHLY':
        next.setMonth(next.getMonth() + 1);
        break;
    }

    return next;
  }
}
