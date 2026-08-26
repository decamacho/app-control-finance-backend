import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  RecurringOrder,
  RecurringFrequency,
} from '../entities/recurring-order.entity';
import { BusinessCustomer } from '../entities/business-customer.entity';
import { BusinessProduct } from '../entities/business-product.entity';

@Injectable()
export class RecurringOrderService {
  constructor(
    @InjectRepository(RecurringOrder)
    private readonly recurringOrderRepository: Repository<RecurringOrder>,
    @InjectRepository(BusinessCustomer)
    private readonly customerRepository: Repository<BusinessCustomer>,
    @InjectRepository(BusinessProduct)
    private readonly productRepository: Repository<BusinessProduct>,
  ) {}

  async create(
    idCustomer: string,
    frequency: RecurringFrequency,
    itemPrices: { idProduct: string; quantity: number; unitPrice: number }[],
    notes?: string,
  ): Promise<RecurringOrder> {
    const customer = await this.customerRepository.findOne({
      where: { idCustomer },
      relations: { business: true },
    });

    if (!customer) {
      throw new NotFoundException('Cliente no encontrado');
    }

    let totalAmount = 0;
    for (const item of itemPrices) {
      const product = await this.productRepository.findOne({
        where: {
          idProduct: item.idProduct,
          business: { idBusiness: customer.business.idBusiness },
        },
      });

      if (!product) {
        throw new BadRequestException(
          `El producto ${item.idProduct} no pertenece al negocio`,
        );
      }

      totalAmount += item.unitPrice * item.quantity;
    }

    const nextDeliveryDate = this.calculateNextDate(frequency, new Date());

    const recurring = this.recurringOrderRepository.create({
      frequency,
      nextDeliveryDate,
      totalAmount: Math.round(totalAmount * 100) / 100,
      isActive: true,
      notes: notes ?? null,
      customer: { idCustomer },
    });

    return this.recurringOrderRepository.save(recurring);
  }

  async findActiveForDate(
    idBusiness: string,
    date: Date,
  ): Promise<RecurringOrder[]> {
    return this.recurringOrderRepository.find({
      where: {
        customer: { business: { idBusiness } },
        isActive: true,
        nextDeliveryDate: date,
      },
      relations: { customer: true },
    });
  }

  async deactivate(idRecurringOrder: string): Promise<RecurringOrder> {
    const recurring = await this.recurringOrderRepository.findOne({
      where: { idRecurringOrder },
    });

    if (!recurring) {
      throw new NotFoundException('Pedido recurrente no encontrado');
    }

    recurring.isActive = false;
    return this.recurringOrderRepository.save(recurring);
  }

  async findAll(idBusiness: string): Promise<RecurringOrder[]> {
    return this.recurringOrderRepository.find({
      where: { customer: { business: { idBusiness } } },
      relations: { customer: true },
      order: { nextDeliveryDate: 'ASC' },
    });
  }

  private calculateNextDate(frequency: RecurringFrequency, from: Date): Date {
    const next = new Date(from);

    switch (frequency) {
      case RecurringFrequency.DAILY:
        next.setDate(next.getDate() + 1);
        break;
      case RecurringFrequency.WEEKLY:
        next.setDate(next.getDate() + 7);
        break;
      case RecurringFrequency.BIWEEKLY:
        next.setDate(next.getDate() + 14);
        break;
      case RecurringFrequency.MONTHLY:
        next.setMonth(next.getMonth() + 1);
        break;
    }

    return next;
  }
}
