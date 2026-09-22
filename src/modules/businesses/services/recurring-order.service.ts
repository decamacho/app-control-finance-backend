import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecurringOrder } from '../entities/recurring-order.entity';
import { BusinessCustomer } from '../entities/business-customer.entity';

@Injectable()
export class RecurringOrderService {
  constructor(
    @InjectRepository(RecurringOrder)
    private readonly recurringOrderRepository: Repository<RecurringOrder>,
    @InjectRepository(BusinessCustomer)
    private readonly customerRepository: Repository<BusinessCustomer>,
  ) {}

  async findActiveForBusiness(idBusiness: string): Promise<RecurringOrder[]> {
    return this.recurringOrderRepository.find({
      where: {
        customer: { business: { idBusiness } },
        isActive: true,
      },
      relations: { customer: true },
    });
  }

  async findAll(idBusiness: string): Promise<RecurringOrder[]> {
    return this.recurringOrderRepository.find({
      where: { customer: { business: { idBusiness } } },
      relations: { customer: true },
      order: { createdAt: 'DESC' },
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

  async activate(idRecurringOrder: string): Promise<RecurringOrder> {
    const recurring = await this.recurringOrderRepository.findOne({
      where: { idRecurringOrder },
    });

    if (!recurring) {
      throw new NotFoundException('Pedido recurrente no encontrado');
    }

    recurring.isActive = true;
    return this.recurringOrderRepository.save(recurring);
  }
}
