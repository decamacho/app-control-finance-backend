import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Business, BusinessType } from '../entities/business.entity';

@Injectable()
export class BusinessValidatorService {
  constructor(
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
  ) {}

  async assertBusinessOwnership(
    idBusiness: string,
    idUser: string,
  ): Promise<Business> {
    const business = await this.businessRepository.findOne({
      where: { idBusiness, user: { idUser }, statusBusiness: 'ACTIVE' },
    });

    if (!business) {
      throw new NotFoundException('Negocio no encontrado');
    }

    return business;
  }

  assertBusinessType(business: Business, ...types: BusinessType[]): void {
    if (!types.includes(business.businessType)) {
      throw new BadRequestException(
        `El negocio no es de tipo ${types.join(' / ')}`,
      );
    }
  }
}
