import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { RecurringOrder } from '../entities/recurring-order.entity';
import { BusinessOrder } from '../entities/business-order.entity';
import { BusinessOrderItem } from '../entities/business-order-item.entity';
import { BusinessProduct } from '../entities/business-product.entity';
import { BusinessCustomer } from '../entities/business-customer.entity';
import { PaymentStatus } from '../types/payment.enum';
import { DeliveryStatus } from '../types/delivery-status.enum';
import { CustomerProductPriceService } from './customer-product-price.service';

const DAY_MAP: Record<number, string> = {
  0: 'SUN',
  1: 'MON',
  2: 'TUE',
  3: 'WED',
  4: 'THU',
  5: 'FRI',
  6: 'SAT',
};

@Injectable()
export class RecurringOrdersCronService {
  private readonly logger = new Logger(RecurringOrdersCronService.name);

  constructor(
    @InjectRepository(RecurringOrder)
    private readonly recurringOrderRepository: Repository<RecurringOrder>,
    @InjectRepository(BusinessOrder)
    private readonly orderRepository: Repository<BusinessOrder>,
    @InjectRepository(BusinessOrderItem)
    private readonly orderItemRepository: Repository<BusinessOrderItem>,
    @InjectRepository(BusinessProduct)
    private readonly productRepository: Repository<BusinessProduct>,
    @InjectRepository(BusinessCustomer)
    private readonly customerRepository: Repository<BusinessCustomer>,
    private readonly customerProductPriceService: CustomerProductPriceService,
  ) {}

  @Cron('0 18 * * *', { timeZone: 'America/Bogota' })
  async generateDailyOrders() {
    this.logger.log('Generando pedidos recurrentes del dia siguiente...');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const dayOfWeek = DAY_MAP[tomorrow.getDay()];

    const todayStr = tomorrow.toISOString().split('T')[0];

    const recurringOrders = await this.recurringOrderRepository
      .createQueryBuilder('ro')
      .leftJoinAndSelect('ro.customer', 'customer')
      .where('ro."isActive" = true')
      .andWhere(`ro."recurringDays" @> :dayJson`, {
        dayJson: JSON.stringify([dayOfWeek]),
      })
      .andWhere(`(ro."startDate" IS NULL OR ro."startDate" <= :today)`, {
        today: todayStr,
      })
      .andWhere(`(ro."endDate" IS NULL OR ro."endDate" >= :today)`, {
        today: todayStr,
      })
      .getMany();

    let generated = 0;

    for (const recurring of recurringOrders) {
      const exists = await this.orderRepository.findOne({
        where: {
          recurringOrder: { idRecurringOrder: recurring.idRecurringOrder },
          deliveryTime: tomorrow,
        },
      });

      if (exists) {
        this.logger.debug(
          `Ya existe pedido para recurrente ${recurring.idRecurringOrder} el ${todayStr}, saltando`,
        );
        continue;
      }

      const [hours, minutes] = recurring.deliveryTime.split(':').map(Number);
      const deliveryTime = new Date(tomorrow);
      deliveryTime.setHours(hours, minutes, 0, 0);

      let totalAmount = 0;
      const items: BusinessOrderItem[] = [];

      for (const fixedItem of recurring.fixedItems) {
        const product = await this.productRepository.findOne({
          where: { idProduct: fixedItem.productId },
        });

        if (!product) {
          this.logger.warn(
            `Producto ${fixedItem.productId} no encontrado, saltando item`,
          );
          continue;
        }

        let unitPrice: number;

        if (
          fixedItem.customPrice !== undefined &&
          fixedItem.customPrice !== null
        ) {
          unitPrice = fixedItem.customPrice;
        } else {
          unitPrice = await this.customerProductPriceService.getPrice(
            recurring.customer.idCustomer,
            product.idProduct,
            Number(product.basePrice),
          );
        }

        const subtotal = Math.round(unitPrice * fixedItem.quantity * 100) / 100;
        totalAmount = Math.round((totalAmount + subtotal) * 100) / 100;

        items.push(
          this.orderItemRepository.create({
            quantity: fixedItem.quantity,
            unitPrice,
            subtotal,
            product: { idProduct: product.idProduct },
          }),
        );
      }

      if (items.length === 0) {
        this.logger.warn(
          `No se generaron items para recurrente ${recurring.idRecurringOrder}, saltando`,
        );
        continue;
      }

      const order = this.orderRepository.create({
        deliveryTime,
        totalAmount,
        paidAmount: 0,
        paymentStatus: PaymentStatus.PENDING,
        deliveryStatus: DeliveryStatus.NOT_DELIVERED,
        customer: { idCustomer: recurring.customer.idCustomer },
        recurringOrder: { idRecurringOrder: recurring.idRecurringOrder },
        items,
      });

      await this.orderRepository.save(order);
      generated++;
    }

    this.logger.log(`${generated} pedidos recurrentes generados`);
  }
}
