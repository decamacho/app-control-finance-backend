import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../../users/entities/user.entity';
import { JwtService } from '../jwt/jwt.service';
import { SessionService } from '../session/session.service';
import { LoginDto } from '../../dto/login.dto';
import { AUTH_ERRORS, STATE_USER } from '../../types/auth.constants';

export interface UserLoginResponse {
  idUser: string;
  nameUser: string;
  firstNameUser: string;
  lastNameUser: string;
  emailUser: string;
  phoneNumberUser: string | null;
  role: {
    idRole: string;
    nameRole: string;
  };
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: UserLoginResponse;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly sessionService: SessionService,
  ) {}

  async login(
    loginDto: LoginDto,
    deviceInfo: string,
    ipAddress: string,
  ): Promise<LoginResponse> {
    const user = await this.userRepository.findOne({
      where: { emailUser: loginDto.email },
      relations: { role: true },
    });

    if (!user || user.statusUser !== STATE_USER.ACTIVE) {
      throw new UnauthorizedException(AUTH_ERRORS.SESSION_NO_FOUND_ACTIVE);
    }

    if (!user.passwordUser) {
      throw new UnauthorizedException(AUTH_ERRORS.TOKEN_INVALID);
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordUser,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException(AUTH_ERRORS.TOKEN_INVALID);
    }

    const sessionId = this.sessionService.generateSessionId();

    const tokens = this.jwtService.generateTokenPair(
      user.idUser,
      user.emailUser,
      user.role.nameRole,
      sessionId,
    );

    await this.sessionService.create(
      {
        idUser: user.idUser,
        deviceInfo,
        ipAddress,
      },
      tokens.refreshToken,
    );

    user.lastLoginUser = new Date();
    await this.userRepository.save(user);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        idUser: user.idUser,
        nameUser: user.nameUser,
        firstNameUser: user.firstNameUser,
        lastNameUser: user.lastNameUser,
        emailUser: user.emailUser,
        phoneNumberUser: user.phoneNumberUser,
        role: {
          idRole: user.role.idRole,
          nameRole: user.role.nameRole,
        },
      },
    };
  }
}
