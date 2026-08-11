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
import { User } from '../../users/entities/user.entity';
import { ProductsService } from '../services/products.service';
import { CreateProductDto, UpdateProductDto } from '../dto/food-sales.dto';

@Controller('businesses/:idBusiness/products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(
    @Param('idBusiness', ParseUUIDPipe) idBusiness: string,
    @CurrentUser() user: User,
  ) {
    return this.productsService.findAll(idBusiness, user.idUser);
  }

  @Post()
  create(
    @Param('idBusiness', ParseUUIDPipe) idBusiness: string,
    @Body() createProductDto: CreateProductDto,
    @CurrentUser() user: User,
  ) {
    return this.productsService.create(
      idBusiness,
      createProductDto,
      user.idUser,
    );
  }

  @Patch(':idProduct')
  update(
    @Param('idBusiness', ParseUUIDPipe) idBusiness: string,
    @Param('idProduct', ParseUUIDPipe) idProduct: string,
    @Body() updateProductDto: UpdateProductDto,
    @CurrentUser() user: User,
  ) {
    return this.productsService.update(
      idBusiness,
      idProduct,
      updateProductDto,
      user.idUser,
    );
  }

  @Delete(':idProduct')
  remove(
    @Param('idBusiness', ParseUUIDPipe) idBusiness: string,
    @Param('idProduct', ParseUUIDPipe) idProduct: string,
    @CurrentUser() user: User,
  ) {
    return this.productsService.remove(idBusiness, idProduct, user.idUser);
  }
}
