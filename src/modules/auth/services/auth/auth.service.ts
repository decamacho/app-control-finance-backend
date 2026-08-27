import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../../users/entities/user.entity';
import { Role } from '../../../users/entities/role.entity';
import { JwtService } from '../jwt/jwt.service';
import { SessionService } from '../session/session.service';
import { EmailVerificationService } from '../email-verification/email-verification.service';
import { LoginAuthDto } from '../../dto/login-auth.dto';
import { RegisterAuthDto } from '../../dto/register-auth.dto';
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

export interface RegisterResponse {
  idUser: string;
  emailUser: string;
  message?: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    private readonly jwtService: JwtService,
    private readonly sessionService: SessionService,
    private readonly emailVerificationService: EmailVerificationService,
  ) {}

  async login(
    loginDto: LoginAuthDto,
    deviceInfo: string,
    ipAddress: string,
  ): Promise<LoginResponse> {
    const user = await this.userRepository.findOne({
      where: { emailUser: loginDto.emailUser },
      relations: { role: true },
    });

    if (!user) {
      throw new UnauthorizedException(AUTH_ERRORS.SESSION_NO_FOUND_ACTIVE);
    }

    if (user.statusUser === STATE_USER.BLOCKED) {
      throw new UnauthorizedException(AUTH_ERRORS.USER_BLOCKED);
    }

    if (user.statusUser === STATE_USER.INACTIVE) {
      throw new UnauthorizedException(AUTH_ERRORS.SESSION_NO_FOUND_ACTIVE);
    }

    if (user.statusUser === STATE_USER.PENDING_VERIFY) {
      throw new UnauthorizedException(AUTH_ERRORS.PENDING_VERIFY);
    }

    if (!user.passwordUser) {
      throw new UnauthorizedException(AUTH_ERRORS.TOKEN_INVALID);
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.passwordUser,
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
        idSession: sessionId,
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

  async register(registerDto: RegisterAuthDto): Promise<RegisterResponse> {
    const existingUser = await this.userRepository.findOne({
      where: { emailUser: registerDto.emailUser },
    });

    if (existingUser) {
      const message = existingUser.isVerifyUser
        ? undefined
        : await this.sendVerificationTokenOrMessage(
            existingUser.idUser,
            existingUser.emailUser,
          );

      return { idUser: '', emailUser: registerDto.emailUser, message };
    }

    const defaultRole = await this.roleRepository.findOne({
      where: { nameRole: 'USER' },
    });

    if (!defaultRole) {
      throw new NotFoundException(AUTH_ERRORS.DEFAULT_ROLE_NOT_FOUND);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(registerDto.passwordUser, salt);

    const newUser = this.userRepository.create({
      nameUser: registerDto.nameUser,
      firstNameUser: registerDto.nameUser,
      lastNameUser: registerDto.nameUser,
      emailUser: registerDto.emailUser,
      passwordUser: hashedPassword,
      statusUser: STATE_USER.PENDING_VERIFY,
      isVerifyUser: false,
      role: defaultRole,
    });

    const savedUser = await this.userRepository.save(newUser);

    const message = await this.sendVerificationTokenOrMessage(
      savedUser.idUser,
      savedUser.emailUser,
    );

    return {
      idUser: savedUser.idUser,
      emailUser: savedUser.emailUser,
      message,
    };
  }

  private async sendVerificationTokenOrMessage(
    idUser: string,
    emailUser: string,
  ): Promise<string | undefined> {
    try {
      await this.emailVerificationService.generateAndSendToken(
        idUser,
        emailUser,
      );
    } catch {
      return 'User registered, but the verification email could not be sent. Please use the resend-verify endpoint.';
    }

    return undefined;
  }

  async verifyEmail(token: string): Promise<{ emailUser: string }> {
    const user = await this.emailVerificationService.verifyEmail(token);

    return { emailUser: user.emailUser };
  }

  async resendVerification(emailUser: string): Promise<{ emailUser: string }> {
    const user = await this.userRepository.findOne({
      where: { emailUser },
    });

    if (user && !user.isVerifyUser) {
      await this.emailVerificationService.generateAndSendToken(
        user.idUser,
        user.emailUser,
      );
    }

    return { emailUser };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ emailUser: string }> {
    const user = await this.userRepository.findOne({
      where: { idUser: userId },
    });

    if (!user) {
      throw new NotFoundException(AUTH_ERRORS.USER_NOT_FOUND);
    }

    if (!user.passwordUser) {
      throw new BadRequestException(AUTH_ERRORS.TOKEN_INVALID);
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.passwordUser,
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException(AUTH_ERRORS.CURRENT_PASSWORD_INCORRECT);
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.passwordUser);

    if (isSamePassword) {
      throw new BadRequestException(AUTH_ERRORS.SAME_PASSWORD);
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordUser = await bcrypt.hash(newPassword, salt);
    await this.userRepository.save(user);

    return {
      emailUser: user.emailUser,
    };
  }

  async logout(refreshToken: string): Promise<void> {
    const payload = this.jwtService.verifyRefreshToken(refreshToken);

    const session = await this.sessionService.findById(payload.sessionId);

    if (!session) {
      throw new NotFoundException(AUTH_ERRORS.SESSION_NOT_FOUND);
    }

    await this.sessionService.invalidateSession(payload.sessionId, payload.sub);
  }

  async getProfile(userId: string): Promise<UserLoginResponse> {
    const user = await this.userRepository.findOne({
      where: { idUser: userId },
      relations: { role: true },
    });

    if (!user) {
      throw new NotFoundException(AUTH_ERRORS.USER_NOT_FOUND);
    }

    return {
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
    };
  }
}
