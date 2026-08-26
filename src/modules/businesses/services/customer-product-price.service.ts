import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerProductPrice } from '../entities/customer-product-price.entity';

@Injectable()
export class CustomerProductPriceService {
  constructor(
    @InjectRepository(CustomerProductPrice)
    private readonly cppRepository: Repository<CustomerProductPrice>,
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
  ): Promise<CustomerProductPrice> {
    let existing = await this.cppRepository.findOne({
      where: {
        customer: { idCustomer },
        product: { idProduct },
      },
    });

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
}
