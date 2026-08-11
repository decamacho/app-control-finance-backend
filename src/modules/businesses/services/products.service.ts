import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Business, BusinessType } from '../entities/business.entity';
import { BusinessProduct } from '../entities/business-product.entity';
import { CreateProductDto, UpdateProductDto } from '../dto/food-sales.dto';
import { BusinessValidatorService } from './business-validator.service';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(BusinessProduct)
    private readonly productRepository: Repository<BusinessProduct>,
    private readonly validator: BusinessValidatorService,
  ) {}

  async findAll(idBusiness: string, idUser: string) {
    await this.assertFoodBusiness(idBusiness, idUser);

    const products = await this.productRepository.find({
      where: { business: { idBusiness } },
      order: { nameProduct: 'ASC' },
    });

    return {
      data: products,
      message: products.length
        ? undefined
        : 'Este negocio no tiene productos registrados',
    };
  }

  async create(idBusiness: string, dto: CreateProductDto, idUser: string) {
    const business = await this.assertFoodBusiness(idBusiness, idUser);

    const product = this.productRepository.create({
      nameProduct: dto.nameProduct.trim(),
      basePrice: dto.basePrice,
      business: { idBusiness: business.idBusiness },
    });

    const saved = await this.productRepository.save(product);

    return {
      data: saved,
      message: 'Producto creado exitosamente',
    };
  }

  async update(
    idBusiness: string,
    idProduct: string,
    dto: UpdateProductDto,
    idUser: string,
  ) {
    await this.assertFoodBusiness(idBusiness, idUser);

    const product = await this.findOwned(idBusiness, idProduct);

    if (dto.nameProduct !== undefined) {
      product.nameProduct = dto.nameProduct.trim();
    }
    if (dto.basePrice !== undefined) {
      product.basePrice = dto.basePrice;
    }

    const saved = await this.productRepository.save(product);

    return {
      data: saved,
      message: 'Producto actualizado exitosamente',
    };
  }

  async remove(idBusiness: string, idProduct: string, idUser: string) {
    await this.assertFoodBusiness(idBusiness, idUser);

    const product = await this.findOwned(idBusiness, idProduct);
    await this.productRepository.remove(product);

    return {
      data: null,
      message: 'Producto eliminado exitosamente',
    };
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

  private async findOwned(
    idBusiness: string,
    idProduct: string,
  ): Promise<BusinessProduct> {
    const product = await this.productRepository.findOne({
      where: { idProduct, business: { idBusiness } },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    return product;
  }
}
