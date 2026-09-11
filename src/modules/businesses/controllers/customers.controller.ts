import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { IdBusinessPipe } from '../../../common/pipes/id-business.pipe';
import { User } from '../../users/entities/user.entity';
import { CustomersService } from '../services/customers.service';
import { CustomerProductPriceService } from '../services/customer-product-price.service';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  CreateProductPriceDto,
} from '../dto/food-sales.dto';

@Controller('businesses/:idBusiness/customers')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(
    private readonly customersService: CustomersService,
    private readonly productPriceService: CustomerProductPriceService,
  ) {}

  @Get()
  findAll(
    @Param('idBusiness', IdBusinessPipe) idBusiness: string,
    @CurrentUser() user: User,
  ) {
    return this.customersService.findAll(idBusiness, user.idUser);
  }

  @Post()
  create(
    @Param('idBusiness', IdBusinessPipe) idBusiness: string,
    @Body() createCustomerDto: CreateCustomerDto,
    @CurrentUser() user: User,
  ) {
    return this.customersService.create(
      idBusiness,
      createCustomerDto,
      user.idUser,
    );
  }

  @Patch(':idCustomer')
  update(
    @Param('idBusiness', IdBusinessPipe) idBusiness: string,
    @Param('idCustomer', ParseUUIDPipe) idCustomer: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
    @CurrentUser() user: User,
  ) {
    return this.customersService.update(
      idBusiness,
      idCustomer,
      updateCustomerDto,
      user.idUser,
    );
  }

  @Delete(':idCustomer')
  remove(
    @Param('idBusiness', IdBusinessPipe) idBusiness: string,
    @Param('idCustomer', ParseUUIDPipe) idCustomer: string,
    @CurrentUser() user: User,
  ) {
    return this.customersService.remove(idBusiness, idCustomer, user.idUser);
  }

  @Post(':idCustomer/product-prices')
  async setProductPrice(
    @Param('idBusiness', IdBusinessPipe) idBusiness: string,
    @Param('idCustomer', ParseUUIDPipe) idCustomer: string,
    @Body() dto: CreateProductPriceDto,
    @CurrentUser() user: User,
  ) {
    await this.customersService.getOwnedCustomer(
      idBusiness,
      idCustomer,
      user.idUser,
    );
    return this.productPriceService.setPrice(
      idCustomer,
      dto.idProduct,
      dto.customPrice,
    );
  }

  @Get(':idCustomer/product-prices')
  async findProductPrices(
    @Param('idBusiness', IdBusinessPipe) idBusiness: string,
    @Param('idCustomer', ParseUUIDPipe) idCustomer: string,
    @CurrentUser() user: User,
  ) {
    await this.customersService.getOwnedCustomer(
      idBusiness,
      idCustomer,
      user.idUser,
    );
    return this.productPriceService.findByCustomer(idCustomer);
  }
}
