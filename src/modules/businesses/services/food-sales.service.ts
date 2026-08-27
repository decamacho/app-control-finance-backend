import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Business, BusinessType } from '../entities/business.entity';
import { BusinessOrder, OrderStatus } from '../entities/business-order.entity';
import { BusinessOrderItem } from '../entities/business-order-item.entity';
import { BusinessCustomer } from '../entities/business-customer.entity';
import { BusinessProduct } from '../entities/business-product.entity';
import { RecurringOrder } from '../entities/recurring-order.entity';
import {
  CreateOrderDto,
  OrderQueryDto,
  RecurringConfigDto,
} from '../dto/food-sales.dto';
import { PaymentStatus } from '../types/payment.enum';
import { DeliveryStatus } from '../types/delivery-status.enum';
import { BusinessValidatorService } from './business-validator.service';
import { CustomerProductPriceService } from './customer-product-price.service';

@Injectable()
export class FoodSalesService {
  constructor(
    @InjectRepository(BusinessOrder)
    private readonly orderRepository: Repository<BusinessOrder>,
    @InjectRepository(BusinessOrderItem)
    private readonly itemRepository: Repository<BusinessOrderItem>,
    @InjectRepository(BusinessCustomer)
    private readonly customerRepository: Repository<BusinessCustomer>,
    @InjectRepository(BusinessProduct)
    private readonly productRepository: Repository<BusinessProduct>,
    @InjectRepository(RecurringOrder)
    private readonly recurringOrderRepository: Repository<RecurringOrder>,
    private readonly validator: BusinessValidatorService,
    private readonly customerProductPriceService: CustomerProductPriceService,
  ) {}

  async createOrder(dto: CreateOrderDto, idUser: string) {
    const business = await this.assertFoodBusiness(dto.idBusiness, idUser);

    const customer = await this.customerRepository.findOne({
      where: {
        idCustomer: dto.idCustomer,
        business: { idBusiness: business.idBusiness },
      },
    });

    if (!customer) {
      throw new NotFoundException('Cliente no encontrado en este negocio');
    }

    const items: BusinessOrderItem[] = [];
    let totalAmount = 0;

    for (const itemDto of dto.items) {
      const product = await this.productRepository.findOne({
        where: {
          idProduct: itemDto.idProduct,
          business: { idBusiness: business.idBusiness },
        },
      });

      if (!product) {
        throw new BadRequestException(
          `El producto ${itemDto.idProduct} no pertenece al negocio`,
        );
      }

      const unitPrice =
        itemDto.unitPrice !== undefined
          ? itemDto.unitPrice
          : await this.customerProductPriceService.getPrice(
              customer.idCustomer,
              product.idProduct,
              Number(product.basePrice),
            );
      const subtotal = Math.round(unitPrice * itemDto.quantity * 100) / 100;
      totalAmount = Math.round((totalAmount + subtotal) * 100) / 100;

      items.push(
        this.itemRepository.create({
          quantity: itemDto.quantity,
          unitPrice,
          subtotal,
          product: { idProduct: product.idProduct },
        }),
      );
    }

    const order = this.orderRepository.create({
      deliveryTime: dto.deliveryTime,
      totalAmount,
      paidAmount: 0,
      paymentStatus: PaymentStatus.PENDING,
      deliveryStatus: DeliveryStatus.NOT_DELIVERED,
      statusOrder: OrderStatus.ACTIVE,
      customer: { idCustomer: customer.idCustomer },
      items,
    });

    const saved = await this.orderRepository.save(order);

    if (dto.isRecurring && dto.recurringConfig) {
      const recurring = await this.createRecurringOrder(
        dto.recurringConfig,
        customer.idCustomer,
        dto.items,
      );

      saved.recurringOrder = recurring;
      await this.orderRepository.save(saved);
    }

    return {
      data: saved,
      message: 'Pedido creado exitosamente',
    };
  }

  async findAll(query: OrderQueryDto, idUser: string) {
    await this.assertFoodBusiness(query.idBusiness, idUser);

    const where: Record<string, unknown> = {
      customer: { business: { idBusiness: query.idBusiness } },
    };

    if (query.status) {
      where.statusOrder = query.status;
    }

    if (query.paymentStatus) {
      where.paymentStatus = query.paymentStatus;
    }

    if (query.deliveryStatus) {
      where.deliveryStatus = query.deliveryStatus;
    }

    const orders = await this.orderRepository.find({
      where,
      relations: {
        items: { product: true },
        customer: true,
        deliveries: { items: { orderItem: { product: true } } },
      },
      order: { deliveryTime: 'DESC' },
    });

    return {
      data: orders.map((order) => this.withPendingAmount(order)),
      message: orders.length ? undefined : 'No se encontraron pedidos',
    };
  }

  async findOne(idOrder: string, idUser: string) {
    const order = await this.findOwnedOrder(idOrder, idUser);

    return {
      data: this.withPendingAmount(order),
      message: undefined,
    };
  }

  async cancel(idOrder: string, idUser: string) {
    const order = await this.findOwnedOrder(idOrder, idUser);

    if (order.statusOrder !== OrderStatus.ACTIVE) {
      throw new BadRequestException('Solo se pueden cancelar pedidos activos');
    }

    order.statusOrder = OrderStatus.CANCELLED;
    const saved = await this.orderRepository.save(order);

    return {
      data: saved,
      message: 'Pedido cancelado exitosamente',
    };
  }

  async toggleRecurring(
    idRecurringOrder: string,
    idUser: string,
  ) {
    const recurring = await this.recurringOrderRepository.findOne({
      where: { idRecurringOrder },
      relations: { customer: { business: true } },
    });

    if (!recurring) {
      throw new NotFoundException('Pedido recurrente no encontrado');
    }

    await this.validator.assertBusinessOwnership(
      recurring.customer.business.idBusiness,
      idUser,
    );

    recurring.isActive = !recurring.isActive;
    const saved = await this.recurringOrderRepository.save(recurring);

    return {
      data: saved,
      message: recurring.isActive
        ? 'Pedido recurrente activado'
        : 'Pedido recurrente desactivado',
    };
  }

  async findRecurringOrders(idBusiness: string, idUser: string) {
    await this.assertFoodBusiness(idBusiness, idUser);

    const recurring = await this.recurringOrderRepository.find({
      where: { customer: { business: { idBusiness } } },
      relations: { customer: true },
      order: { createdAt: 'DESC' },
    });

    return {
      data: recurring,
      message: recurring.length
        ? undefined
        : 'No hay pedidos recurrentes configurados',
    };
  }

  private async createRecurringOrder(
    config: RecurringConfigDto,
    idCustomer: string,
    items: { idProduct: string; quantity: number; unitPrice?: number }[],
  ): Promise<RecurringOrder> {
    const fixedItems = items.map((item) => ({
      productId: item.idProduct,
      quantity: item.quantity,
      customPrice: item.unitPrice,
    }));

    const recurring = this.recurringOrderRepository.create({
      recurringDays: config.recurringDays,
      deliveryTime: config.deliveryTime,
      startDate: config.startDate
        ? new Date(config.startDate)
        : null,
      endDate: config.endDate
        ? new Date(config.endDate)
        : null,
      isActive: true,
      fixedItems,
      customer: { idCustomer },
    });

    return this.recurringOrderRepository.save(recurring);
  }

  private async findOwnedOrder(
    idOrder: string,
    idUser: string,
  ): Promise<BusinessOrder> {
    const order = await this.orderRepository.findOne({
      where: { idOrder },
      relations: {
        customer: { business: true },
        items: { product: true },
        deliveries: { items: { orderItem: { product: true } } },
      },
    });

    if (!order) {
      throw new NotFoundException('Pedido no encontrado');
    }

    await this.validator.assertBusinessOwnership(
      order.customer.business.idBusiness,
      idUser,
    );

    return order;
  }

  private async assertFoodBusiness(
    idBusiness: string,
    idUser: string,
  ): Promise<Business> {
    const business = await this.validator.assertBusinessOwnership(
      idBusiness,
      idUser,
    );
    this.validator.assertBusinessType(business, BusinessType.FOOD_SALE);
    return business;
  }

  private withPendingAmount(order: BusinessOrder) {
    const total = Number(order.totalAmount);
    const paid = Number(order.paidAmount);
    return {
      ...order,
      pendingAmount: Math.round((total - paid) * 100) / 100,
    };
  }
}
