import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '../jwt/jwt.service';
import { SessionService } from '../session/session.service';
import { User } from '../../../users/entities/user.entity';
import { AUTH_ERRORS, STATE_USER } from '../../types/auth.constants';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class RefreshTokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly sessionService: SessionService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async refresh(
    refreshToken: string,
    deviceInfo: string,
    ipAddress: string,
  ): Promise<TokenPair> {
    const payload = this.jwtService.verifyRefreshToken(refreshToken);

    const user = await this.userRepository.findOne({
      where: { idUser: payload.sub, statusUser: STATE_USER.ACTIVE },
      relations: { role: true },
    });

    if (!user) {
      throw new UnauthorizedException(AUTH_ERRORS.SESSION_NO_FOUND_ACTIVE);
    }

    const session = await this.sessionService.validateRefreshToken(
      payload.sessionId,
      refreshToken,
    );

    await this.sessionService.invalidateSession(
      session.idSession,
      user.idUser,
    );

    const newSessionId = this.sessionService.generateSessionId();

    const tokens = this.jwtService.generateTokenPair(
      user.idUser,
      user.emailUser,
      user.role.nameRole,
      newSessionId,
    );

    await this.sessionService.create(
      {
        idUser: user.idUser,
        deviceInfo,
        ipAddress,
      },
      tokens.refreshToken,
    );

    return tokens;
  }
}
