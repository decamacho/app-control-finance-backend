import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
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
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: JWT_CONSTANTS.SECRET,
    });
  }

  async validate(payload: JwtPayload): Promise<Omit<User, 'passwordUser'>> {
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
