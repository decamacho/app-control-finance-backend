import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, IsNull, type FindOperator } from 'typeorm';
import { Business, BusinessType } from '../entities/business.entity';
import {
  BusinessOrder,
  OrderStatus,
  OrderType,
} from '../entities/business-order.entity';
import { BusinessOrderItem } from '../entities/business-order-item.entity';
import { BusinessCustomer } from '../entities/business-customer.entity';
import { BusinessProduct } from '../entities/business-product.entity';
import { RecurringOrder } from '../entities/recurring-order.entity';
import { Payment } from '../entities/payment.entity';
import {
  CreateSaleOrderDto,
  CreateExpenseOrderDto,
  UpdateOrderDto,
  OrderQueryDto,
  DailySummaryQueryDto,
  RecurringConfigDto,
  UpdateRecurringDto,
} from '../dto/food-sales.dto';
import { PaymentStatus, PaymentMethod } from '../types/payment.enum';
import { DeliveryStatus } from '../types/delivery-status.enum';
import { BusinessValidatorService } from './business-validator.service';
import { CustomerProductPriceService } from './customer-product-price.service';

type OrderProductCount = {
  idProduct: string;
  nameProduct: string;
  quantity: number;
};

type CustomerSummaryEntry = {
  idCustomer: string;
  nameCustomer: string;
  total: number;
  paid: number;
  lastCreatedAt: Date;
  ordersCount: number;
  items: Map<string, OrderProductCount>;
  pendingItems: Map<string, OrderProductCount>;
};

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
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly validator: BusinessValidatorService,
    private readonly customerProductPriceService: CustomerProductPriceService,
  ) {}

  async createOrder(
    dto: CreateSaleOrderDto | CreateExpenseOrderDto,
    idUser: string,
  ) {
    if (dto.orderType === OrderType.EXPENSE) {
      return this.createExpense(dto, idUser);
    }
    return this.createSale(dto, idUser);
  }

  private async createSale(dto: CreateSaleOrderDto, idUser: string) {
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

    if (dto.isRecurring && dto.recurringConfig) {
      const existingRecurring = await this.recurringOrderRepository.findOne({
        where: { customer: { idCustomer: customer.idCustomer } },
      });

      if (existingRecurring) {
        throw new BadRequestException(
          'El cliente ya tiene un pedido recurrente configurado',
        );
      }
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

      const unitPrice = await this.customerProductPriceService.getPrice(
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
      orderType: OrderType.SALE,
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

  private async createExpense(dto: CreateExpenseOrderDto, idUser: string) {
    const business = await this.assertFoodBusiness(dto.idBusiness, idUser);

    const order = this.orderRepository.create({
      orderType: OrderType.EXPENSE,
      deliveryTime: dto.deliveryTime,
      description: dto.description,
      totalAmount: dto.totalAmount,
      paidAmount: dto.totalAmount,
      paymentStatus: PaymentStatus.PAID,
      deliveryStatus: DeliveryStatus.DELIVERED,
      statusOrder: OrderStatus.ACTIVE,
      customer: null,
      business: { idBusiness: business.idBusiness },
    });

    const saved = await this.orderRepository.save(order);

    return {
      data: saved,
      message: 'Gasto registrado exitosamente',
    };
  }

  async updateOrder(idOrder: string, dto: UpdateOrderDto, idUser: string) {
    const order = await this.findOwnedOrder(idOrder, idUser);

    if (order.statusOrder !== OrderStatus.ACTIVE) {
      throw new BadRequestException('Solo se pueden editar pedidos activos');
    }

    if (order.orderType === OrderType.EXPENSE) {
      throw new BadRequestException(
        'Los gastos no se pueden editar, cancele y registre uno nuevo',
      );
    }

    if (!order.customer) {
      throw new BadRequestException('Esta orden no tiene cliente asociado');
    }

    if (order.deliveryStatus !== DeliveryStatus.NOT_DELIVERED) {
      if (dto.items) {
        for (const itemDto of dto.items) {
          const existingItem = order.items.find(
            (i) => i.product?.idProduct === itemDto.idProduct,
          );
          if (existingItem) {
            const delivered = order.getDeliveredQuantity(itemDto.idProduct);
            if (itemDto.quantity < delivered) {
              throw new BadRequestException(
                `No se puede reducir la cantidad del producto ${itemDto.idProduct} por debajo de lo ya entregado (${delivered})`,
              );
            }
          }
        }
      }
    }

    if (dto.deliveryTime) {
      order.deliveryTime = dto.deliveryTime;
    }

    if (dto.items) {
      const newItems: BusinessOrderItem[] = [];
      let totalAmount = 0;

      for (const itemDto of dto.items) {
        if (itemDto.quantity === 0) {
          const delivered = order.getDeliveredQuantity(itemDto.idProduct);
          if (delivered > 0) {
            throw new BadRequestException(
              `No se puede eliminar el producto ${itemDto.idProduct} porque ya tiene entregas registradas`,
            );
          }
          continue;
        }

        const product = await this.productRepository.findOne({
          where: {
            idProduct: itemDto.idProduct,
            business: { idBusiness: order.customer.business.idBusiness },
          },
        });

        if (!product) {
          throw new BadRequestException(
            `El producto ${itemDto.idProduct} no pertenece al negocio`,
          );
        }

        const unitPrice = await this.customerProductPriceService.getPrice(
          order.customer.idCustomer,
          product.idProduct,
          Number(product.basePrice),
        );

        const existingItem = order.items.find(
          (i) => i.product?.idProduct === itemDto.idProduct,
        );

        const quantity = existingItem ? itemDto.quantity : itemDto.quantity;

        const subtotal = Math.round(unitPrice * quantity * 100) / 100;
        totalAmount = Math.round((totalAmount + subtotal) * 100) / 100;

        if (existingItem) {
          existingItem.quantity = quantity;
          existingItem.unitPrice = unitPrice;
          existingItem.subtotal = subtotal;
          newItems.push(existingItem);
        } else {
          newItems.push(
            this.itemRepository.create({
              quantity,
              unitPrice,
              subtotal,
              product: { idProduct: product.idProduct },
            }),
          );
        }
      }

      if (order.paidAmount > totalAmount) {
        throw new BadRequestException(
          'El monto pagado supera el nuevo total de la orden',
        );
      }

      await this.itemRepository.remove(
        order.items.filter(
          (i) =>
            !newItems.find(
              (n) => n.product?.idProduct === i.product?.idProduct,
            ),
        ),
      );

      order.items = newItems;
      order.totalAmount = totalAmount;
      order.paymentStatus = this.calculatePaymentStatus(
        totalAmount,
        order.paidAmount,
      );
    }

    const saved = await this.orderRepository.save(order);

    return {
      data: saved,
      message: 'Pedido actualizado exitosamente',
    };
  }

  async findAll(query: OrderQueryDto, idUser: string) {
    await this.assertFoodBusiness(query.idBusiness, idUser);

    const filters: Record<string, unknown> = {};

    filters.statusOrder = query.status ?? OrderStatus.ACTIVE;

    if (query.orderType) {
      filters.orderType = query.orderType;
    }

    if (query.paymentStatus) {
      filters.paymentStatus = query.paymentStatus;
    }

    if (query.deliveryStatus) {
      filters.deliveryStatus = query.deliveryStatus;
    }

    const dateStr = query.date ?? this.todayInBogota();
    const dayRange = Between(
      `${dateStr}T00:00:00.000Z`,
      `${dateStr}T23:59:59.999Z`,
    ) as unknown as FindOperator<Date>;

    const where = [
      {
        customer: { business: { idBusiness: query.idBusiness } },
        ...filters,
        deliveryTime: dayRange,
      },
      {
        business: { idBusiness: query.idBusiness },
        ...filters,
        deliveryTime: dayRange,
      },
    ];

    const orders = await this.orderRepository.find({
      where,
      relations: {
        items: { product: true },
        customer: true,
        deliveries: { items: { orderItem: { product: true } } },
      },
      order: { createdAt: 'DESC' },
    });

    return {
      data: orders.map((order) => this.withPendingAmount(order)),
      message: orders.length ? undefined : 'No se encontraron pedidos',
    };
  }

  async getDailySummary(
    idBusiness: string,
    query: DailySummaryQueryDto,
    idUser: string,
  ) {
    await this.assertFoodBusiness(idBusiness, idUser);

    const dateStr = query.date ?? this.todayInBogota();
    const dayRange = Between(
      `${dateStr}T00:00:00.000Z`,
      `${dateStr}T23:59:59.999Z`,
    ) as unknown as FindOperator<Date>;

    const where = [
      {
        customer: { business: { idBusiness } },
        orderType: OrderType.SALE,
        statusOrder: OrderStatus.ACTIVE,
        deliveryTime: dayRange,
      },
      {
        business: { idBusiness },
        orderType: OrderType.EXPENSE,
        statusOrder: OrderStatus.ACTIVE,
        deliveryTime: dayRange,
      },
    ];

    const orders = await this.orderRepository.find({
      where,
      relations: { customer: true, business: true },
    });

    const payments = await this.paymentRepository.find({
      where: [
        { paymentDate: dayRange },
        { paymentDate: IsNull(), createdAt: dayRange },
      ],
      relations: {
        order: { customer: { business: true }, business: true },
      },
    });

    return {
      data: {
        date: dateStr,
        ...this.summaryTotals(idBusiness, orders, payments),
      },
      message: undefined,
    };
  }

  async getDailySummaryByCustomer(
    idBusiness: string,
    query: DailySummaryQueryDto,
    idUser: string,
  ) {
    await this.assertFoodBusiness(idBusiness, idUser);

    const dateStr = query.date ?? this.todayInBogota();
    const dayRange = Between(
      `${dateStr}T00:00:00.000Z`,
      `${dateStr}T23:59:59.999Z`,
    ) as unknown as FindOperator<Date>;

    const where = [
      {
        customer: { business: { idBusiness } },
        orderType: OrderType.SALE,
        statusOrder: OrderStatus.ACTIVE,
        deliveryTime: dayRange,
      },
      {
        business: { idBusiness },
        orderType: OrderType.EXPENSE,
        statusOrder: OrderStatus.ACTIVE,
        deliveryTime: dayRange,
      },
    ];

    const orders = await this.orderRepository.find({
      where,
      relations: {
        customer: true,
        business: true,
        items: { product: true },
        deliveries: { items: { orderItem: { product: true } } },
      },
    });

    const payments = await this.paymentRepository.find({
      where: [
        { paymentDate: dayRange },
        { paymentDate: IsNull(), createdAt: dayRange },
      ],
      relations: {
        order: { customer: { business: true }, business: true },
      },
    });

    const customers = this.groupDailySummaryByCustomer(orders);

    return {
      data: {
        date: dateStr,
        summary: this.summaryTotals(idBusiness, orders, payments),
        customers,
      },
      message: undefined,
    };
  }

  private summaryTotals(
    idBusiness: string,
    orders: BusinessOrder[],
    payments: Payment[],
  ) {
    let cash = 0;
    let otherPayment = 0;
    let expenses = 0;
    let salesCount = 0;
    let expensesCount = 0;

    for (const payment of payments) {
      const order = payment.order;
      const orderBusiness =
        order?.customer?.business?.idBusiness ?? order?.business?.idBusiness;

      if (!order || order.orderType !== OrderType.SALE) {
        continue;
      }
      if (orderBusiness !== idBusiness) {
        continue;
      }

      if (payment.paymentMethod === PaymentMethod.CASH) {
        cash += Number(payment.amount);
      } else {
        otherPayment += Number(payment.amount);
      }
    }

    const received = cash + otherPayment;

    for (const order of orders) {
      if (order.orderType === OrderType.EXPENSE) {
        expenses += Number(order.totalAmount);
        expensesCount++;
      } else {
        salesCount++;
      }
    }

    return {
      received: Math.round(received * 100) / 100,
      cash: Math.round(cash * 100) / 100,
      otherPayment: Math.round(otherPayment * 100) / 100,
      expenses: Math.round(expenses * 100) / 100,
      net: Math.round((received - expenses) * 100) / 100,
      salesCount,
      expensesCount,
    };
  }

  private groupDailySummaryByCustomer(orders: BusinessOrder[]) {
    const customers = new Map<string, CustomerSummaryEntry>();

    for (const order of orders) {
      if (order.orderType !== OrderType.SALE) continue;
      const customer = order.customer;
      if (!customer) continue;

      let entry = customers.get(customer.idCustomer);
      if (!entry) {
        entry = {
          idCustomer: customer.idCustomer,
          nameCustomer: customer.nameCustomer,
          total: 0,
          paid: 0,
          lastCreatedAt: order.createdAt,
          ordersCount: 0,
          items: new Map(),
          pendingItems: new Map(),
        };
        customers.set(customer.idCustomer, entry);
      }

      entry.total += Number(order.totalAmount);
      entry.paid += Number(order.paidAmount);
      entry.ordersCount++;
      if (order.createdAt > entry.lastCreatedAt) {
        entry.lastCreatedAt = order.createdAt;
      }

      const delivered = new Map<string, number>();
      for (const delivery of order.deliveries ?? []) {
        for (const deliveryItem of delivery.items ?? []) {
          const productId = deliveryItem.orderItem?.product?.idProduct;
          if (!productId) continue;
          delivered.set(
            productId,
            (delivered.get(productId) ?? 0) + deliveryItem.quantity,
          );
        }
      }

      for (const item of order.items ?? []) {
        const productId = item.product?.idProduct;
        const nameProduct = item.product?.nameProduct;
        if (!productId || !nameProduct) continue;

        const existing = entry.items.get(productId);
        if (existing) {
          existing.quantity += item.quantity;
        } else {
          entry.items.set(productId, {
            idProduct: productId,
            nameProduct,
            quantity: item.quantity,
          });
        }

        const pending = item.quantity - (delivered.get(productId) ?? 0);
        if (pending <= 0) continue;

        const pendingItem = entry.pendingItems.get(productId);
        if (pendingItem) {
          pendingItem.quantity += pending;
        } else {
          entry.pendingItems.set(productId, {
            idProduct: productId,
            nameProduct,
            quantity: pending,
          });
        }
      }
    }

    const list = [...customers.values()];

    list.sort((a, b) => b.lastCreatedAt.getTime() - a.lastCreatedAt.getTime());

    return list.map((entry) => {
      const total = Math.round(entry.total * 100) / 100;
      const paid = Math.round(entry.paid * 100) / 100;
      const owed = Math.round((total - paid) * 100) / 100;

      const items = [...entry.items.values()].map((item) => ({
        idProduct: item.idProduct,
        nameProduct: item.nameProduct,
        quantity: item.quantity,
      }));

      const pendingDeliveryItems = [...entry.pendingItems.values()].map(
        (item) => ({
          idProduct: item.idProduct,
          nameProduct: item.nameProduct,
          quantity: item.quantity,
        }),
      );

      let paymentStatus = PaymentStatus.PENDING;
      if (total > 0 && paid >= total) {
        paymentStatus = PaymentStatus.PAID;
      } else if (paid > 0 && paid < total) {
        paymentStatus = PaymentStatus.PARTIAL;
      }

      const pendingQuantity = pendingDeliveryItems.reduce(
        (sum, item) => sum + item.quantity,
        0,
      );
      const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

      let deliveryStatus = DeliveryStatus.DELIVERED;
      if (pendingQuantity > 0 && pendingQuantity === totalQuantity) {
        deliveryStatus = DeliveryStatus.NOT_DELIVERED;
      } else if (pendingQuantity > 0) {
        deliveryStatus = DeliveryStatus.PARTIAL_DELIVERED;
      }

      return {
        idCustomer: entry.idCustomer,
        nameCustomer: entry.nameCustomer,
        total,
        paid,
        owed,
        paymentStatus,
        paymentLabel: this.paymentStatusLabel(paymentStatus),
        deliveryStatus,
        deliveryLabel: this.deliveryStatusLabel(deliveryStatus),
        items,
        pendingDeliveryItems,
        ordersCount: entry.ordersCount,
      };
    });
  }

  private paymentStatusLabel(status: PaymentStatus): string {
    const labels: Record<PaymentStatus, string> = {
      [PaymentStatus.PENDING]: 'Pendiente pago',
      [PaymentStatus.PARTIAL]: 'Parcialmente pago',
      [PaymentStatus.PAID]: 'Pagado',
    };
    return labels[status];
  }

  private deliveryStatusLabel(status: DeliveryStatus): string {
    const labels: Record<DeliveryStatus, string> = {
      [DeliveryStatus.NOT_DELIVERED]: 'Pendiente entrega',
      [DeliveryStatus.PARTIAL_DELIVERED]: 'Entrega parcial',
      [DeliveryStatus.DELIVERED]: 'Entregado',
    };
    return labels[status];
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

  async toggleRecurring(idRecurringOrder: string, idUser: string) {
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
    items: { idProduct: string; quantity: number }[],
  ): Promise<RecurringOrder> {
    const fixedItems = items.map((item) => ({
      productId: item.idProduct,
      quantity: item.quantity,
    }));

    const recurring = this.recurringOrderRepository.create({
      recurringDays: config.recurringDays,
      deliveryTime: config.deliveryTime,
      startDate: config.startDate ? new Date(config.startDate) : null,
      endDate: config.endDate ? new Date(config.endDate) : null,
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
        business: true,
        items: { product: true },
        deliveries: { items: { orderItem: { product: true } } },
      },
    });

    if (!order) {
      throw new NotFoundException('Pedido no encontrado');
    }

    const idBusiness =
      order.customer?.business?.idBusiness ?? order.business?.idBusiness;

    if (!idBusiness) {
      throw new BadRequestException('La orden no tiene negocio asociado');
    }

    await this.validator.assertBusinessOwnership(idBusiness, idUser);

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

  private todayInBogota(): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }

  private withPendingAmount(order: BusinessOrder) {
    const total = Number(order.totalAmount);
    const paid = Number(order.paidAmount);
    return {
      ...order,
      pendingAmount: Math.round((total - paid) * 100) / 100,
    };
  }

  private calculatePaymentStatus(
    totalAmount: number,
    paidAmount: number,
  ): PaymentStatus {
    if (paidAmount <= 0) return PaymentStatus.PENDING;
    if (paidAmount >= totalAmount) return PaymentStatus.PAID;
    return PaymentStatus.PARTIAL;
  }
}
