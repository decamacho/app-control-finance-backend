import {
  ConflictException,
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../entities/role.entity';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';

interface PostgresError {
  code: string;
  detail?: string;
  message: string;
}

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async create(createRoleDto: CreateRoleDto): Promise<Role> {
    try {
      const normalizedName = createRoleDto.nameRole.toUpperCase().trim();

      const newRole = this.roleRepository.create({
        ...createRoleDto,
        nameRole: normalizedName,
      });

      return await this.roleRepository.save(newRole);
    } catch (error: unknown) {
      const dbError = error as PostgresError;

      if (dbError.code === '23505') {
        throw new ConflictException(
          `El rol '${createRoleDto.nameRole.toUpperCase()}' ya existe en el sistema.`,
        );
      }
      throw new InternalServerErrorException(
        'Error inesperado al crear el rol. Intentalo de nuevo.',
      );
    }
  }

  async findAll(): Promise<Role[]> {
    return await this.roleRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(idRole: string): Promise<Role> {
    const role = await this.roleRepository.findOne({ where: { idRole } });

    if (!role) {
      throw new NotFoundException(
        `El rol con ID [${idRole}] no fue encontrado.`,
      );
    }

    return role;
  }

  async update(idRole: string, updateRoleDto: UpdateRoleDto): Promise<Role> {
    const role = await this.findOne(idRole);

    if (updateRoleDto.nameRole) {
      updateRoleDto.nameRole = updateRoleDto.nameRole.toUpperCase().trim();
    }

    try {
      const updatedRole = this.roleRepository.merge(role, updateRoleDto);
      return await this.roleRepository.save(updatedRole);
    } catch (error: unknown) {
      const dbError = error as PostgresError;

      if (dbError.code === '23505') {
        throw new ConflictException(
          `No se puede actualizar. El nombre de rol '${updateRoleDto.nameRole}' ya esta en uso.`,
        );
      }
      throw new InternalServerErrorException(
        'Error inesperado al actualizar el rol.',
      );
    }
  }

  async remove(idRole: string): Promise<{ message: string }> {
    const role = await this.findOne(idRole);

    try {
      await this.roleRepository.remove(role);
      return {
        message: `El rol '${role.nameRole}' fue eliminado exitosamente.`,
      };
    } catch (error: unknown) {
      const dbError = error as PostgresError;

      if (dbError.code === '23503') {
        throw new ConflictException(
          `No se puede eliminar el rol '${role.nameRole}' porque tiene usuarios asignados. En su lugar, cambia su 'stateRol' a falso.`,
        );
      }
      throw new InternalServerErrorException(
        'Error al intentar eliminar el rol.',
      );
    }
  }
}
