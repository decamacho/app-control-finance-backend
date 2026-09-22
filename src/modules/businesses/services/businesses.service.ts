import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Business } from '../entities/business.entity';
import { CreateBusinessDto, UpdateBusinessDto } from '../dto/business.dto';
import { BusinessValidatorService } from './business-validator.service';

interface PostgresError {
  code: string;
  detail?: string;
  message: string;
}

@Injectable()
export class BusinessesService {
  constructor(
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
    private readonly validator: BusinessValidatorService,
  ) {}

  async create(dto: CreateBusinessDto, idUser: string) {
    const business = this.businessRepository.create({
      nameBusiness: dto.nameBusiness.trim(),
      businessType: dto.businessType,
      statusBusiness: 'ACTIVE',
      user: { idUser },
    });

    try {
      const saved = await this.businessRepository.save(business);
      return {
        data: this.toBusinessResponse(saved),
        message: 'Negocio creado exitosamente',
      };
    } catch (error: unknown) {
      const dbError = error as PostgresError;
      if (dbError.code === '23505') {
        throw new ConflictException('Ya existe un negocio con estos datos');
      }
      throw error;
    }
  }

  async findAll(idUser: string) {
    const businesses = await this.businessRepository.find({
      where: { user: { idUser }, statusBusiness: 'ACTIVE' },
      order: { createdAt: 'DESC' },
    });

    return {
      data: businesses.map((business) => this.toBusinessResponse(business)),
      message: businesses.length
        ? undefined
        : 'No se encontraron negocios para este usuario',
    };
  }

  async findOne(idBusiness: string, idUser: string) {
    const business = await this.validator.assertBusinessOwnership(
      idBusiness,
      idUser,
    );

    return {
      data: this.toBusinessResponse(business),
      message: undefined,
    };
  }

  async update(idBusiness: string, dto: UpdateBusinessDto, idUser: string) {
    const business = await this.validator.assertBusinessOwnership(
      idBusiness,
      idUser,
    );

    if (dto.nameBusiness !== undefined) {
      business.nameBusiness = dto.nameBusiness.trim();
    }

    try {
      const saved = await this.businessRepository.save(business);
      return {
        data: this.toBusinessResponse(saved),
        message: 'Negocio actualizado exitosamente',
      };
    } catch (error: unknown) {
      const dbError = error as PostgresError;
      if (dbError.code === '23505') {
        throw new ConflictException('Ya existe un negocio con estos datos');
      }
      throw error;
    }
  }

  async remove(idBusiness: string, idUser: string) {
    const business = await this.validator.assertBusinessOwnership(
      idBusiness,
      idUser,
    );

    business.statusBusiness = 'INACTIVE';
    const saved = await this.businessRepository.save(business);

    return {
      data: this.toBusinessResponse(saved),
      message: 'Negocio desactivado exitosamente',
    };
  }

  private toBusinessResponse(business: Business) {
    return {
      idBusiness: business.idBusiness,
      nameBusiness: business.nameBusiness,
      businessType: business.businessType,
    };
  }
}
