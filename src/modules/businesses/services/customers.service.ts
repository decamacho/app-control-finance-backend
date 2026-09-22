import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Business, BusinessType } from '../entities/business.entity';
import { BusinessCustomer } from '../entities/business-customer.entity';
import { CreateCustomerDto, UpdateCustomerDto } from '../dto/food-sales.dto';
import { BusinessValidatorService } from './business-validator.service';
import { RecurringOrderService } from './recurring-order.service';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(BusinessCustomer)
    private readonly customerRepository: Repository<BusinessCustomer>,
    private readonly validator: BusinessValidatorService,
    private readonly recurringOrderService: RecurringOrderService,
  ) {}

  async findAll(idBusiness: string, idUser: string) {
    await this.assertFoodBusiness(idBusiness, idUser);

    const customers = await this.customerRepository.find({
      where: { business: { idBusiness } },
      order: { nameCustomer: 'ASC' },
    });

    const recurring =
      await this.recurringOrderService.findActiveForBusiness(idBusiness);
    const recurringCustomerIds = new Set(
      recurring.map((r) => r.customer?.idCustomer),
    );

    const data = customers.map((customer) => ({
      ...customer,
      hasRecurringOrder: recurringCustomerIds.has(customer.idCustomer),
    }));

    return {
      data,
      message: customers.length
        ? undefined
        : 'Este negocio no tiene clientes registrados',
    };
  }

  async create(idBusiness: string, dto: CreateCustomerDto, idUser: string) {
    const business = await this.assertFoodBusiness(idBusiness, idUser);

    const customer = this.customerRepository.create({
      nameCustomer: dto.nameCustomer.trim(),
      locationCustomer: dto.locationCustomer.trim(),
      phoneCustomer: dto.phoneCustomer ?? null,
      business: { idBusiness: business.idBusiness },
    });

    const saved = await this.customerRepository.save(customer);

    return {
      data: saved,
      message: 'Cliente creado exitosamente',
    };
  }

  async update(
    idBusiness: string,
    idCustomer: string,
    dto: UpdateCustomerDto,
    idUser: string,
  ) {
    await this.assertFoodBusiness(idBusiness, idUser);

    const customer = await this.findOwned(idBusiness, idCustomer);

    if (dto.nameCustomer !== undefined) {
      customer.nameCustomer = dto.nameCustomer.trim();
    }
    if (dto.locationCustomer !== undefined) {
      customer.locationCustomer = dto.locationCustomer.trim();
    }
    if (dto.phoneCustomer !== undefined) {
      customer.phoneCustomer = dto.phoneCustomer;
    }

    const saved = await this.customerRepository.save(customer);

    return {
      data: saved,
      message: 'Cliente actualizado exitosamente',
    };
  }

  async remove(idBusiness: string, idCustomer: string, idUser: string) {
    await this.assertFoodBusiness(idBusiness, idUser);

    const customer = await this.findOwned(idBusiness, idCustomer);
    await this.customerRepository.remove(customer);

    return {
      data: null,
      message: 'Cliente eliminado exitosamente',
    };
  }

  async getOwnedCustomer(
    idBusiness: string,
    idCustomer: string,
    idUser: string,
  ): Promise<BusinessCustomer> {
    await this.assertFoodBusiness(idBusiness, idUser);
    return this.findOwned(idBusiness, idCustomer);
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
    idCustomer: string,
  ): Promise<BusinessCustomer> {
    const customer = await this.customerRepository.findOne({
      where: { idCustomer, business: { idBusiness } },
    });

    if (!customer) {
      throw new NotFoundException('Cliente no encontrado');
    }

    return customer;
  }
}
