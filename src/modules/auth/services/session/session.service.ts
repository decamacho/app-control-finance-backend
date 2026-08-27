import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { RedisService } from '../../../redis/redis.service';
import { AUTH_ERRORS, JWT_CONSTANTS } from '../../types/auth.constants';

export interface CreateSessionParams {
  idUser: string;
  deviceInfo: string;
  ipAddress: string;
  idSession?: string;
}

export interface SessionResponse {
  idSession: string;
  deviceInfo: string;
  ipAddress: string;
  createdAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

@Injectable()
export class SessionService {
  constructor(private readonly redisService: RedisService) {}

  private sessionKey(idSession: string): string {
    return `session:${idSession}`;
  }

  private userSessionsKey(idUser: string): string {
    return `user_sessions:${idUser}`;
  }

  async create(
    params: CreateSessionParams,
    refreshToken: string,
  ): Promise<{ idSession: string }> {
    const idSession = params.idSession ?? this.generateSessionId();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const refreshTokenHash = await bcrypt.hash(
      JWT_CONSTANTS.REFRESH_TOKEN_PREFIX + refreshToken,
      10,
    );

    await this.redisService.hset(this.sessionKey(idSession), {
      idSession,
      idUser: params.idUser,
      deviceInfo: params.deviceInfo,
      ipAddress: params.ipAddress,
      refreshTokenHash,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      isActive: 'true',
    });

    await this.redisService.expire(
      this.sessionKey(idSession),
      SESSION_TTL_SECONDS,
    );

    await this.redisService.sadd(
      this.userSessionsKey(params.idUser),
      idSession,
    );

    return { idSession };
  }

  async findById(idSession: string): Promise<{
    idSession: string;
    idUser: string;
    deviceInfo: string;
    ipAddress: string;
    refreshTokenHash: string;
    createdAt: Date;
    expiresAt: Date;
    isActive: boolean;
  } | null> {
    const data = await this.redisService.hgetall(this.sessionKey(idSession));

    if (!data || !data.idSession) return null;

    return {
      idSession: data.idSession,
      idUser: data.idUser,
      deviceInfo: data.deviceInfo,
      ipAddress: data.ipAddress,
      refreshTokenHash: data.refreshTokenHash,
      createdAt: new Date(data.createdAt),
      expiresAt: new Date(data.expiresAt),
      isActive: data.isActive === 'true',
    };
  }

  async findByUserId(idUser: string): Promise<SessionResponse[]> {
    const sessionIds = await this.redisService.smembers(
      this.userSessionsKey(idUser),
    );

    const sessions: SessionResponse[] = [];

    for (const idSession of sessionIds) {
      const data = await this.redisService.hgetall(this.sessionKey(idSession));

      if (data && data.idSession && data.isActive === 'true') {
        sessions.push({
          idSession: data.idSession,
          deviceInfo: data.deviceInfo,
          ipAddress: data.ipAddress,
          createdAt: new Date(data.createdAt),
          expiresAt: new Date(data.expiresAt),
          isActive: data.isActive === 'true',
        });
      }
    }

    sessions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return sessions;
  }

  async validateRefreshToken(
    idSession: string,
    refreshToken: string,
  ): Promise<{
    idSession: string;
    idUser: string;
    isActive: boolean;
    expiresAt: Date;
  }> {
    const data = await this.redisService.hgetall(this.sessionKey(idSession));

    if (!data || !data.idSession || data.isActive !== 'true') {
      throw new NotFoundException(AUTH_ERRORS.SESSION_NOT_FOUND);
    }

    if (new Date() > new Date(data.expiresAt)) {
      await this.redisService.hset(this.sessionKey(idSession), {
        isActive: 'false',
      });
      throw new ForbiddenException(AUTH_ERRORS.SESSION_EXPIRED);
    }

    const isValid = await bcrypt.compare(
      JWT_CONSTANTS.REFRESH_TOKEN_PREFIX + refreshToken,
      data.refreshTokenHash,
    );

    if (!isValid) {
      throw new ForbiddenException(AUTH_ERRORS.REFRESH_TOKEN_INVALID);
    }

    return {
      idSession: data.idSession,
      idUser: data.idUser,
      isActive: true,
      expiresAt: new Date(data.expiresAt),
    };
  }

  async invalidateSession(idSession: string, idUser: string): Promise<void> {
    const data = await this.redisService.hgetall(this.sessionKey(idSession));

    if (!data || !data.idSession || data.idUser !== idUser) {
      throw new NotFoundException(AUTH_ERRORS.SESSION_NOT_FOUND);
    }

    await this.redisService.hset(this.sessionKey(idSession), {
      isActive: 'false',
    });

    await this.redisService.srem(this.userSessionsKey(idUser), idSession);
  }

  async invalidateAllUserSessions(idUser: string): Promise<void> {
    const sessionIds = await this.redisService.smembers(
      this.userSessionsKey(idUser),
    );

    for (const idSession of sessionIds) {
      await this.redisService.hset(this.sessionKey(idSession), {
        isActive: 'false',
      });
    }

    await this.redisService.del(this.userSessionsKey(idUser));
  }

  async cleanupExpiredSessions(): Promise<void> {
    const keys = await this.redisService.getClient().keys('session:*');

    for (const key of keys) {
      const ttl = await this.redisService.getClient().ttl(key);
      if (ttl < 0) {
        const idSession = key.split(':')[1];
        const idUser = await this.redisService.hget(key, 'idUser');
        if (idUser) {
          await this.redisService.srem(this.userSessionsKey(idUser), idSession);
        }
        await this.redisService.del(key);
      }
    }
  }

  generateSessionId(): string {
    return crypto.randomUUID();
  }
}
