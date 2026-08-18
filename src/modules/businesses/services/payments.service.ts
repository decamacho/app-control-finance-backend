import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessType } from '../entities/business.entity';
import { BusinessOrder, OrderStatus } from '../entities/business-order.entity';
import { ParkingTicket, TicketStatus } from '../entities/parking-ticket.entity';
import { Payment } from '../entities/payment.entity';
import { RegisterPaymentsDto } from '../dto/payment.dto';
import { PaymentStatus } from '../types/payment.enum';
import { BusinessValidatorService } from './business-validator.service';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(BusinessOrder)
    private readonly orderRepository: Repository<BusinessOrder>,
    @InjectRepository(ParkingTicket)
    private readonly ticketRepository: Repository<ParkingTicket>,
    private readonly validator: BusinessValidatorService,
  ) {}

  async registerOrderPayment(
    idOrder: string,
    dto: RegisterPaymentsDto,
    idUser: string,
  ) {
    const order = await this.findOrder(idOrder);

    await this.validator.assertBusinessOwnership(
      order.business.idBusiness,
      idUser,
    );
    this.validator.assertBusinessType(order.business, BusinessType.FOOD_SALE);

    if (order.statusOrder !== OrderStatus.ACTIVE) {
      throw new BadRequestException(
        'No se pueden registrar pagos en un pedido cancelado',
      );
    }

    const total = Number(order.totalAmount);
    const amount = dto.payments.reduce(
      (sum, payment) => sum + payment.amount,
      0,
    );
    const newPaid = Number(order.paidAmount) + amount;

    if (newPaid > total) {
      throw new BadRequestException('El pago supera el total del pedido');
    }

    const roundedPaid = Math.round(newPaid * 100) / 100;

    const payments = dto.payments.map((payment) =>
      this.paymentRepository.create({
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        order: { idOrder: order.idOrder },
      }),
    );

    order.paidAmount = roundedPaid >= total ? total : roundedPaid;
    order.paymentStatus =
      roundedPaid >= total ? PaymentStatus.PAID : PaymentStatus.PARTIAL;

    const paymentsSaved = await this.paymentRepository.save(payments);
    const orderSaved = await this.orderRepository.save(order);

    return {
      data: {
        payments: paymentsSaved.map((payment) =>
          this.toPaymentResponse(payment),
        ),
        order: {
          ...orderSaved,
          pendingAmount: this.pendingAmount(total, roundedPaid),
        },
      },
      message: 'Pago registrado correctamente',
    };
  }

  async registerTicketPayment(
    idTicket: string,
    dto: RegisterPaymentsDto,
    idUser: string,
  ) {
    const ticket = await this.findTicket(idTicket);

    await this.validator.assertBusinessOwnership(
      ticket.business.idBusiness,
      idUser,
    );
    this.validator.assertBusinessType(ticket.business, BusinessType.PARKING);

    if (ticket.statusTicket !== TicketStatus.COMPLETED) {
      throw new BadRequestException(
        'El ticket debe estar liquidado para registrar pagos',
      );
    }

    const total = Number(ticket.totalAmount ?? 0);
    const amount = dto.payments.reduce(
      (sum, payment) => sum + payment.amount,
      0,
    );
    const newPaid = Number(ticket.paidAmount ?? 0) + amount;

    if (newPaid > total) {
      throw new BadRequestException('El pago supera el total del ticket');
    }

    const roundedPaid = Math.round(newPaid * 100) / 100;

    const payments = dto.payments.map((payment) =>
      this.paymentRepository.create({
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        ticket: { idTicket: ticket.idTicket },
      }),
    );

    ticket.paidAmount = roundedPaid >= total ? total : roundedPaid;
    ticket.paymentStatus =
      roundedPaid >= total ? PaymentStatus.PAID : PaymentStatus.PARTIAL;

    const paymentsSaved = await this.paymentRepository.save(payments);
    const ticketSaved = await this.ticketRepository.save(ticket);

    return {
      data: {
        payments: paymentsSaved.map((payment) =>
          this.toPaymentResponse(payment),
        ),
        ticket: {
          ...ticketSaved,
          pendingAmount: this.pendingAmount(total, roundedPaid),
        },
      },
      message: 'Pago registrado correctamente',
    };
  }

  async findOrderPayments(idOrder: string, idUser: string) {
    const order = await this.findOrder(idOrder);

    await this.validator.assertBusinessOwnership(
      order.business.idBusiness,
      idUser,
    );

    const payments = await this.paymentRepository.find({
      where: { order: { idOrder } },
      order: { createdAt: 'DESC' },
    });

    return {
      data: payments.map((payment) => this.toPaymentResponse(payment)),
      message: payments.length
        ? undefined
        : 'Este pedido no tiene pagos registrados',
    };
  }

  async findTicketPayments(idTicket: string, idUser: string) {
    const ticket = await this.findTicket(idTicket);

    await this.validator.assertBusinessOwnership(
      ticket.business.idBusiness,
      idUser,
    );

    const payments = await this.paymentRepository.find({
      where: { ticket: { idTicket } },
      order: { createdAt: 'DESC' },
    });

    return {
      data: payments.map((payment) => this.toPaymentResponse(payment)),
      message: payments.length
        ? undefined
        : 'Este ticket no tiene pagos registrados',
    };
  }

  private pendingAmount(total: number, paid: number): number {
    return Math.round((total - paid) * 100) / 100;
  }

  private toPaymentResponse(payment: Payment) {
    return {
      idPayment: payment.idPayment,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
    };
  }

  private async findOrder(idOrder: string): Promise<BusinessOrder> {
    const order = await this.orderRepository.findOne({
      where: { idOrder },
      relations: { business: true },
    });

    if (!order) {
      throw new NotFoundException('Pedido no encontrado');
    }

    return order;
  }

  private async findTicket(idTicket: string): Promise<ParkingTicket> {
    const ticket = await this.ticketRepository.findOne({
      where: { idTicket },
      relations: { business: true },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket no encontrado');
    }

    return ticket;
  }
}
