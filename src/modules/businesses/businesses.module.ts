import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessesController } from './controllers/businesses.controller';
import { ParkingController } from './controllers/parking.controller';
import { ParkingRatesController } from './controllers/parking-rates.controller';
import { FoodSalesController } from './controllers/food-sales.controller';
import { CustomersController } from './controllers/customers.controller';
import { ProductsController } from './controllers/products.controller';
import { BusinessesService } from './services/businesses.service';
import { BusinessValidatorService } from './services/business-validator.service';
import { ParkingService } from './services/parking.service';
import { ParkingRatesService } from './services/parking-rates.service';
import { PricingService } from './services/pricing.service';
import { CustomersService } from './services/customers.service';
import { ProductsService } from './services/products.service';
import { FoodSalesService } from './services/food-sales.service';
import { PaymentsService } from './services/payments.service';
import { Business } from './entities/business.entity';
import { Vehicle } from './entities/vehicle.entity';
import { ParkingRate } from './entities/parking-rate.entity';
import { ParkingTicket } from './entities/parking-ticket.entity';
import { BusinessCustomer } from './entities/business-customer.entity';
import { BusinessProduct } from './entities/business-product.entity';
import { BusinessOrder } from './entities/business-order.entity';
import { BusinessOrderItem } from './entities/business-order-item.entity';
import { Payment } from './entities/payment.entity';
import { Transaction } from '../transactions/entities/transaction.entity';

@Module({
  controllers: [
    BusinessesController,
    ParkingController,
    ParkingRatesController,
    FoodSalesController,
    CustomersController,
    ProductsController,
  ],
  providers: [
    BusinessesService,
    BusinessValidatorService,
    ParkingService,
    ParkingRatesService,
    PricingService,
    CustomersService,
    ProductsService,
    FoodSalesService,
    PaymentsService,
  ],
  imports: [
    TypeOrmModule.forFeature([
      Business,
      Vehicle,
      ParkingRate,
      ParkingTicket,
      BusinessCustomer,
      BusinessProduct,
      BusinessOrder,
      BusinessOrderItem,
      Payment,
      Transaction,
    ]),
  ],
  exports: [TypeOrmModule, BusinessValidatorService],
})
export class BusinessesModule {}
