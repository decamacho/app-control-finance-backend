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
import { CreateCustomerDto, UpdateCustomerDto } from '../dto/food-sales.dto';

@Controller('businesses/:idBusiness/customers')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

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
}
