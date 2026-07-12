import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '../jwt/jwt.service';
import { SessionService } from '../session/session.service';
import { User } from '../../../users/entities/user.entity';
import { AUTH_ERRORS } from '../../types/auth.constants';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class RefreshTokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly sessionService: SessionService,
  ) {}

  async refresh(refreshToken: string, user: User): Promise<TokenPair> {
    const payload = this.jwtService.verifyRefreshToken(refreshToken);

    if (payload.sub !== user.idUser) {
      throw new UnauthorizedException(AUTH_ERRORS.TOKEN_INVALID);
    }

    const session = await this.sessionService.validateRefreshToken(
      payload.sessionId,
      refreshToken,
    );

    if (!session.isActive) {
      throw new ForbiddenException(AUTH_ERRORS.SESSION_EXPIRED);
    }

    const sessionId = this.sessionService.generateSessionId();

    const tokens = this.jwtService.generateTokenPair(
      user.idUser,
      user.emailUser,
      user.role.nameRole,
      sessionId,
    );

    return tokens;
  }

  async rotateRefreshToken(
    oldRefreshToken: string,
    user: User,
    deviceInfo: string,
    ipAddress: string,
  ): Promise<TokenPair> {
    const payload = this.jwtService.verifyRefreshToken(oldRefreshToken);

    if (payload.sub !== user.idUser) {
      throw new UnauthorizedException(AUTH_ERRORS.TOKEN_INVALID);
    }

    const session = await this.sessionService.validateRefreshToken(
      payload.sessionId,
      oldRefreshToken,
    );

    await this.sessionService.invalidateSession(session.idSession, user.idUser);

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
