import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Request } from 'express';
import { User } from '../../users/entities/user.entity';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { TokenBlacklistService } from '../services/token-blacklist/token-blacklist.service';
import {
  AUTH_ERRORS,
  JWT_CONSTANTS,
  STATE_USER,
} from '../types/auth.constants';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly tokenBlacklistService: TokenBlacklistService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      passReqToCallback: true,
      secretOrKey: JWT_CONSTANTS.SECRET,
    });
  }

  async validate(
    request: Request,
    payload: JwtPayload,
  ): Promise<Omit<User, 'passwordUser'>> {
    const authHeader = request.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7)
      : null;

    if (token && this.tokenBlacklistService.has(token)) {
      throw new UnauthorizedException(AUTH_ERRORS.TOKEN_INVALID);
    }

    const user = await this.userRepository.findOne({
      where: { idUser: payload.sub },
      relations: { role: true },
    });

    if (!user || user.statusUser !== STATE_USER.ACTIVE) {
      throw new UnauthorizedException(AUTH_ERRORS.SESSION_NO_FOUND_ACTIVE);
    }

    const result = { ...user } as Partial<User>;
    delete result.passwordUser;
    return result as Omit<User, 'passwordUser'>;
  }
}
