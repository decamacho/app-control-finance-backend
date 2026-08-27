import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { User } from '../../users/entities/user.entity';
import { FoodSalesService } from '../services/food-sales.service';
import { PaymentsService } from '../services/payments.service';
import { OrderDeliveryService } from '../services/order-delivery.service';
import { CreateOrderDto, OrderQueryDto } from '../dto/food-sales.dto';
import { RegisterPaymentsDto } from '../dto/payment.dto';
import { CreateDeliveryDto } from '../dto/delivery.dto';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class FoodSalesController {
  constructor(
    private readonly foodSalesService: FoodSalesService,
    private readonly paymentsService: PaymentsService,
    private readonly orderDeliveryService: OrderDeliveryService,
  ) {}

  @Post()
  create(@Body() createOrderDto: CreateOrderDto, @CurrentUser() user: User) {
    return this.foodSalesService.createOrder(createOrderDto, user.idUser);
  }

  @Get()
  findAll(@Query() orderQueryDto: OrderQueryDto, @CurrentUser() user: User) {
    return this.foodSalesService.findAll(orderQueryDto, user.idUser);
  }

  @Get(':idOrder')
  findOne(
    @Param('idOrder', ParseUUIDPipe) idOrder: string,
    @CurrentUser() user: User,
  ) {
    return this.foodSalesService.findOne(idOrder, user.idUser);
  }

  @Delete(':idOrder')
  cancel(
    @Param('idOrder', ParseUUIDPipe) idOrder: string,
    @CurrentUser() user: User,
  ) {
    return this.foodSalesService.cancel(idOrder, user.idUser);
  }

  @Post(':idOrder/payments')
  registerPayment(
    @Param('idOrder', ParseUUIDPipe) idOrder: string,
    @Body() registerPaymentsDto: RegisterPaymentsDto,
    @CurrentUser() user: User,
  ) {
    return this.paymentsService.registerOrderPayment(
      idOrder,
      registerPaymentsDto,
      user.idUser,
    );
  }

  @Get(':idOrder/payments')
  findPayments(
    @Param('idOrder', ParseUUIDPipe) idOrder: string,
    @CurrentUser() user: User,
  ) {
    return this.paymentsService.findOrderPayments(idOrder, user.idUser);
  }

  @Post(':idOrder/deliveries')
  createDelivery(
    @Param('idOrder', ParseUUIDPipe) idOrder: string,
    @Body() createDeliveryDto: CreateDeliveryDto,
    @CurrentUser() user: User,
  ) {
    return this.orderDeliveryService.createDelivery(
      idOrder,
      createDeliveryDto,
      user.idUser,
    );
  }

  @Get(':idOrder/deliveries')
  findDeliveries(
    @Param('idOrder', ParseUUIDPipe) idOrder: string,
    @CurrentUser() user: User,
  ) {
    return this.orderDeliveryService.findDeliveries(idOrder, user.idUser);
  }

  @Get(':idOrder/delivery-summary')
  getDeliverySummary(
    @Param('idOrder', ParseUUIDPipe) idOrder: string,
    @CurrentUser() user: User,
  ) {
    return this.orderDeliveryService.getDeliverySummary(idOrder, user.idUser);
  }

  @Patch(':idOrder/recurring/:idRecurringOrder/toggle')
  toggleRecurring(
    @Param('idRecurringOrder', ParseUUIDPipe) idRecurringOrder: string,
    @CurrentUser() user: User,
  ) {
    return this.foodSalesService.toggleRecurring(idRecurringOrder, user.idUser);
  }

  @Get('recurring/:idBusiness')
  findRecurringOrders(
    @Param('idBusiness', ParseUUIDPipe) idBusiness: string,
    @CurrentUser() user: User,
  ) {
    return this.foodSalesService.findRecurringOrders(idBusiness, user.idUser);
  }
}
