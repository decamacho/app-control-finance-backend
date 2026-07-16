import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { JWT_CONSTANTS, AUTH_ERRORS } from '../../types/auth.constants';
import {
  JwtPayload,
  RefreshPayload,
} from '../../interfaces/jwt-payload.interface';

@Injectable()
export class JwtService {
  private readonly secret: string;

  constructor(
    private readonly jwtService: NestJwtService,
    configService: ConfigService,
  ) {
    this.secret = configService.get<string>('JWT_SECRET')!;
  }

  generateAccessToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.secret,
      expiresIn: JWT_CONSTANTS.ACCESS_EXPIRES_IN,
    });
  }

  generateRefreshToken(payload: RefreshPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.secret,
      expiresIn: JWT_CONSTANTS.REFRESH_EXPIRES_IN,
    });
  }

  generateTokenPair(
    userId: string,
    email: string,
    role: string,
    sessionId: string,
  ): { accessToken: string; refreshToken: string } {
    const accessPayload: JwtPayload = {
      sub: userId,
      email,
      role,
      sessionId,
    };

    const refreshPayload: RefreshPayload = {
      sub: userId,
      sessionId,
      type: 'refresh',
    };

    return {
      accessToken: this.generateAccessToken(accessPayload),
      refreshToken: this.generateRefreshToken(refreshPayload),
    };
  }

  verifyAccessToken(token: string): JwtPayload {
    try {
      return this.jwtService.verify<JwtPayload>(token, {
        secret: this.secret,
      });
    } catch (error: unknown) {
      const err = error as { name: string };
      if (err.name === 'TokenExpiredError') {
        throw new UnauthorizedException(AUTH_ERRORS.TOKEN_EXPIRED);
      }
      throw new UnauthorizedException(AUTH_ERRORS.TOKEN_INVALID);
    }
  }

  verifyRefreshToken(token: string): RefreshPayload {
    try {
      return this.jwtService.verify<RefreshPayload>(token, {
        secret: this.secret,
      });
    } catch (error: unknown) {
      const err = error as { name: string };
      if (err.name === 'TokenExpiredError') {
        throw new UnauthorizedException(AUTH_ERRORS.REFRESH_TOKEN_INVALID);
      }
      throw new UnauthorizedException(AUTH_ERRORS.REFRESH_TOKEN_INVALID);
    }
  }

  extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }
}
