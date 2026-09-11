import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerProductPrice } from '../entities/customer-product-price.entity';
import { BusinessProduct } from '../entities/business-product.entity';

@Injectable()
export class CustomerProductPriceService {
  constructor(
    @InjectRepository(CustomerProductPrice)
    private readonly cppRepository: Repository<CustomerProductPrice>,
    @InjectRepository(BusinessProduct)
    private readonly productRepository: Repository<BusinessProduct>,
  ) {}

  async getPrice(
    idCustomer: string,
    idProduct: string,
    basePrice: number,
  ): Promise<number> {
    const custom = await this.cppRepository.findOne({
      where: {
        customer: { idCustomer },
        product: { idProduct },
      },
    });

    return custom ? Number(custom.customPrice) : basePrice;
  }

  async setPrice(
    idCustomer: string,
    idProduct: string,
    customPrice: number,
  ): Promise<CustomerProductPrice | null> {
    const product = await this.productRepository.findOne({
      where: { idProduct },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    const equalsBase =
      this.round2(customPrice) === this.round2(Number(product.basePrice));

    const existing = await this.cppRepository.findOne({
      where: {
        customer: { idCustomer },
        product: { idProduct },
      },
    });

    if (equalsBase) {
      if (existing) {
        await this.cppRepository.remove(existing);
      }
      return null;
    }

    if (existing) {
      existing.customPrice = customPrice;
      return this.cppRepository.save(existing);
    }

    const created = this.cppRepository.create({
      customPrice,
      customer: { idCustomer },
      product: { idProduct },
    });

    return this.cppRepository.save(created);
  }

  async findByCustomer(idCustomer: string): Promise<CustomerProductPrice[]> {
    return this.cppRepository.find({
      where: { customer: { idCustomer } },
      relations: { product: true },
    });
  }

  private round2(value: number): number {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  }
}
