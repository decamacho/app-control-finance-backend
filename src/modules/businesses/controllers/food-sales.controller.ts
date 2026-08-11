import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { User } from '../../users/entities/user.entity';
import { FoodSalesService } from '../services/food-sales.service';
import { PaymentsService } from '../services/payments.service';
import { CreateOrderDto, OrderQueryDto } from '../dto/food-sales.dto';
import { RegisterPaymentsDto } from '../dto/payment.dto';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class FoodSalesController {
  constructor(
    private readonly foodSalesService: FoodSalesService,
    private readonly paymentsService: PaymentsService,
  ) {}

  @Post()
  create(@Body() createOrderDto: CreateOrderDto, @CurrentUser() user: User) {
    return this.foodSalesService.createOrder(createOrderDto, user.idUser);
  }

  @Get()
  findAll(@Query() orderQueryDto: OrderQueryDto, @CurrentUser() user: User) {
    return this.foodSalesService.findAll(orderQueryDto, user.idUser);
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
}
