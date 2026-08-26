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
import { CreateOrderDto, OrderQueryDto } from '../dto/food-sales.dto';
import { PaymentStatus } from '../types/payment.enum';
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

      const basePrice = itemDto.unitPrice ?? Number(product.basePrice);
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
      statusOrder: OrderStatus.ACTIVE,
      customer: { idCustomer: customer.idCustomer },
      items,
    });

    const saved = await this.orderRepository.save(order);

    return {
      data: saved,
      message: 'Pedido creado exitosamente',
    };
  }

  async findAll(query: OrderQueryDto, idUser: string) {
    await this.assertFoodBusiness(query.idBusiness, idUser);

    const orders = await this.orderRepository.find({
      where: {
        customer: { business: { idBusiness: query.idBusiness } },
        statusOrder: query.status,
        paymentStatus: query.paymentStatus,
      },
      relations: { items: { product: true }, customer: true },
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

  private async findOwnedOrder(
    idOrder: string,
    idUser: string,
  ): Promise<BusinessOrder> {
    const order = await this.orderRepository.findOne({
      where: { idOrder },
      relations: {
        customer: { business: true },
        items: { product: true },
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
