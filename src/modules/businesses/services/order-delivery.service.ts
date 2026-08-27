import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderDelivery } from '../entities/order-delivery.entity';
import { OrderDeliveryItem } from '../entities/order-delivery-item.entity';
import { BusinessOrder, OrderStatus } from '../entities/business-order.entity';
import { BusinessOrderItem } from '../entities/business-order-item.entity';
import { DeliveryStatus } from '../types/delivery-status.enum';
import { CreateDeliveryDto } from '../dto/delivery.dto';
import { BusinessValidatorService } from './business-validator.service';

@Injectable()
export class OrderDeliveryService {
  constructor(
    @InjectRepository(OrderDelivery)
    private readonly deliveryRepository: Repository<OrderDelivery>,
    @InjectRepository(OrderDeliveryItem)
    private readonly deliveryItemRepository: Repository<OrderDeliveryItem>,
    @InjectRepository(BusinessOrder)
    private readonly orderRepository: Repository<BusinessOrder>,
    @InjectRepository(BusinessOrderItem)
    private readonly orderItemRepository: Repository<BusinessOrderItem>,
    private readonly validator: BusinessValidatorService,
  ) {}

  async createDelivery(
    idOrder: string,
    dto: CreateDeliveryDto,
    idUser: string,
  ) {
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

    if (order.statusOrder === OrderStatus.CANCELLED) {
      throw new BadRequestException(
        'No se pueden registrar entregas en un pedido cancelado',
      );
    }

    const deliveryItems: OrderDeliveryItem[] = [];

    for (const itemDto of dto.items) {
      const orderItem = order.items.find(
        (i) => i.idOrderItem === itemDto.idOrderItem,
      );

      if (!orderItem) {
        throw new BadRequestException(
          `El item ${itemDto.idOrderItem} no pertenece a este pedido`,
        );
      }

      if (itemDto.quantity <= 0) {
        throw new BadRequestException('quantity debe ser mayor a 0');
      }

      const deliveredSoFar = this.getDeliveredQuantityForItem(
        order,
        itemDto.idOrderItem,
      );

      const remaining = orderItem.quantity - deliveredSoFar;

      if (itemDto.quantity > remaining) {
        throw new BadRequestException(
          `Se pueden entregar maximo ${remaining} unidades del producto ${orderItem.product?.nameProduct ?? itemDto.idOrderItem} (ya se entregaron ${deliveredSoFar} de ${orderItem.quantity})`,
        );
      }

      deliveryItems.push(
        this.deliveryItemRepository.create({
          quantity: itemDto.quantity,
          orderItem: { idOrderItem: itemDto.idOrderItem },
        }),
      );
    }

    const deliveryStatus = this.calculateDeliveryStatus(
      order,
      deliveryItems,
    );

    const delivery = this.deliveryRepository.create({
      status: deliveryStatus,
      notes: dto.notes ?? null,
      order: { idOrder: order.idOrder },
      items: deliveryItems,
    });

    const saved = await this.deliveryRepository.save(delivery);

    order.deliveryStatus = deliveryStatus;
    await this.orderRepository.save(order);

    return {
      data: saved,
      message: 'Entrega registrada exitosamente',
    };
  }

  async findDeliveries(idOrder: string, idUser: string) {
    const order = await this.orderRepository.findOne({
      where: { idOrder },
      relations: { customer: { business: true } },
    });

    if (!order) {
      throw new NotFoundException('Pedido no encontrado');
    }

    await this.validator.assertBusinessOwnership(
      order.customer.business.idBusiness,
      idUser,
    );

    const deliveries = await this.deliveryRepository.find({
      where: { order: { idOrder } },
      relations: { items: { orderItem: { product: true } } },
      order: { deliveredAt: 'ASC' },
    });

    return {
      data: deliveries,
      message: deliveries.length
        ? undefined
        : 'Este pedido no tiene entregas registradas',
    };
  }

  async getDeliverySummary(idOrder: string, idUser: string) {
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

    const summary = order.items.map((item) => {
      const deliveredQty = this.getDeliveredQuantityForItem(
        order,
        item.idOrderItem,
      );

      return {
        idOrderItem: item.idOrderItem,
        productId: item.product?.idProduct,
        productName: item.product?.nameProduct,
        orderedQuantity: item.quantity,
        deliveredQuantity: deliveredQty,
        pendingQuantity: item.quantity - deliveredQty,
        fullyDelivered: deliveredQty >= item.quantity,
      };
    });

    return {
      data: {
        idOrder: order.idOrder,
        deliveryStatus: order.deliveryStatus,
        items: summary,
      },
      message: undefined,
    };
  }

  private getDeliveredQuantityForItem(
    order: BusinessOrder,
    idOrderItem: string,
  ): number {
    if (!order.deliveries) return 0;
    return order.deliveries
      .flatMap((d) => d.items)
      .filter((i) => i.orderItem?.idOrderItem === idOrderItem)
      .reduce((sum, i) => sum + i.quantity, 0);
  }

  private calculateDeliveryStatus(
    order: BusinessOrder,
    newDeliveryItems: OrderDeliveryItem[],
  ): DeliveryStatus {
    const allFullyDelivered = order.items.every((orderItem) => {
      const deliveredBefore = this.getDeliveredQuantityForItem(
        order,
        orderItem.idOrderItem,
      );

      const newDeliveryItem = newDeliveryItems.find(
        (d) => d.orderItem?.idOrderItem === orderItem.idOrderItem,
      );

      const deliveredAfter =
        deliveredBefore + (newDeliveryItem?.quantity ?? 0);

      return deliveredAfter >= orderItem.quantity;
    });

    if (allFullyDelivered) {
      return DeliveryStatus.DELIVERED;
    }

    return DeliveryStatus.PARTIAL_DELIVERED;
  }
}
