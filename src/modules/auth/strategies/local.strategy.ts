import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { AUTH_ERRORS, STATE_USER } from '../types/auth.constants';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    super({
      usernameField: 'emailUser',
      passwordField: 'passwordUser',
    });
  }

  async validate(
    emailUser: string,
    passwordUser: string,
  ): Promise<Omit<User, 'passwordUser'>> {
    const user = await this.userRepository.findOne({
      where: { emailUser },
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
      passwordUser,
      user.passwordUser,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException(AUTH_ERRORS.TOKEN_INVALID);
    }

    const result = { ...user } as Partial<User>;
    delete result.passwordUser;
    return result as Omit<User, 'passwordUser'>;
  }
}
