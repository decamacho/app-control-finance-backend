import {
  ConflictException,
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import * as bcrypt from 'bcrypt';

interface PostgresDatabaseError {
  code: string;
  detail?: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async create(
    createUserDto: CreateUserDto,
  ): Promise<Omit<User, 'passwordUser'>> {
    const { idRole, passwordUser, ...userData } = createUserDto;

    const roleFound = await this.roleRepository.findOneBy({ idRole });
    if (!roleFound) {
      throw new NotFoundException(
        `El rol con ID '${idRole}' no existe en el sistema`,
      );
    }

    try {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(passwordUser, salt);

      const newUser = this.userRepository.create({
        ...userData,
        passwordUser: hashedPassword,
        role: roleFound,
      });

      const savedUser = await this.userRepository.save(newUser);

      const userCleaned = { ...savedUser } as Partial<User>;
      delete userCleaned.passwordUser;

      return userCleaned as Omit<User, 'passwordUser'>;
    } catch (error: unknown) {
      const dbError = error as PostgresDatabaseError;
      if (dbError?.code === '23505') {
        throw new ConflictException(
          `El correo electrónico '${createUserDto.emailUser}' ya se encuentra registrado`,
        );
      }
      throw new InternalServerErrorException(
        'Ocurrio un error inesperado al procesar el usuario',
      );
    }
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      relations: { role: true },
      select: {
        idUser: true,
        nameUser: true,
        firstNameUser: true,
        lastNameUser: true,
        emailUser: true,
        phoneNumberUser: true,
        googleIdUser: true,
        statusUser: true,
        isVerifyUser: true,
        countryUser: true,
        currencyDefault: true,
        lastLoginUser: true,
        createdAt: true,
        modifyAt: true,
      },
    });
  }

  async findOne(id: string): Promise<User> {
    const userFound = await this.userRepository.findOne({
      where: { idUser: id },
      relations: { role: true },
      select: {
        idUser: true,
        nameUser: true,
        firstNameUser: true,
        lastNameUser: true,
        emailUser: true,
        phoneNumberUser: true,
        googleIdUser: true,
        statusUser: true,
        isVerifyUser: true,
        countryUser: true,
        currencyDefault: true,
        lastLoginUser: true,
        createdAt: true,
        modifyAt: true,
      },
    });

    if (!userFound) {
      throw new NotFoundException(`Usuario con ID '${id}' no encontrado`);
    }
    return userFound;
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<Omit<User, 'passwordUser'>> {
    const userInstance = await this.userRepository.findOneBy({ idUser: id });
    if (!userInstance) {
      throw new NotFoundException(`Usuario con ID '${id}' no encontrado`);
    }

    const { idRole, passwordUser, ...updateData } = updateUserDto;

    if (idRole) {
      const roleFound = await this.roleRepository.findOneBy({ idRole });
      if (!roleFound)
        throw new NotFoundException(`El rol con ID '${idRole}' no existe`);
      userInstance.role = roleFound;
    }

    if (passwordUser) {
      const salt = await bcrypt.genSalt(10);
      userInstance.passwordUser = await bcrypt.hash(passwordUser, salt);
    }

    Object.assign(userInstance, updateData);

    try {
      const updatedUser = await this.userRepository.save(userInstance);
      const userCleaned = { ...updatedUser } as Partial<User>;
      delete userCleaned.passwordUser;
      return userCleaned as Omit<User, 'passwordUser'>;
    } catch (error: unknown) {
      const dbError = error as PostgresDatabaseError;
      if (dbError?.code === '23505') {
        throw new ConflictException(
          'El correo electrónico ingresado ya pertenece a otra cuenta',
        );
      }
      throw new InternalServerErrorException(
        'Error al intentar actualizar el usuario',
      );
    }
  }

  async remove(id: string): Promise<{ message: string }> {
    const userInstance = await this.findOne(id);

    userInstance.statusUser = 'INACTIVE';
    await this.userRepository.save(userInstance);

    return {
      message: `Usuario '${userInstance.firstNameUser} ${userInstance.lastNameUser}' dado de baja con exito`,
    };
  }
}
