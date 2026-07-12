import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Session } from '../../entities/session.entity';
import { AUTH_ERRORS, JWT_CONSTANTS } from '../../types/auth.constants';

export interface CreateSessionParams {
  idUser: string;
  deviceInfo: string;
  ipAddress: string;
}

export interface SessionResponse {
  idSession: string;
  deviceInfo: string;
  ipAddress: string;
  createdAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
  ) {}

  async create(
    params: CreateSessionParams,
    refreshToken: string,
  ): Promise<Session> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const hashedRefreshToken = await bcrypt.hash(
      JWT_CONSTANTS.REFRESH_TOKEN_PREFIX + refreshToken,
      10,
    );

    const session = this.sessionRepository.create({
      idUser: params.idUser,
      deviceInfo: params.deviceInfo,
      ipAddress: params.ipAddress,
      refreshToken: hashedRefreshToken,
      expiresAt,
      isActive: true,
    });

    return this.sessionRepository.save(session);
  }

  async findById(idSession: string): Promise<Session | null> {
    return this.sessionRepository.findOne({
      where: { idSession },
    });
  }

  async findByUserId(idUser: string): Promise<SessionResponse[]> {
    const sessions = await this.sessionRepository.find({
      where: { idUser, isActive: true },
      order: { createdAt: 'DESC' },
      select: {
        idSession: true,
        deviceInfo: true,
        ipAddress: true,
        createdAt: true,
        expiresAt: true,
        isActive: true,
      },
    });

    return sessions;
  }

  async validateRefreshToken(
    idSession: string,
    refreshToken: string,
  ): Promise<Session> {
    const session = await this.sessionRepository.findOne({
      where: { idSession, isActive: true },
    });

    if (!session) {
      throw new NotFoundException(AUTH_ERRORS.SESSION_NOT_FOUND);
    }

    if (new Date() > session.expiresAt) {
      session.isActive = false;
      await this.sessionRepository.save(session);
      throw new ForbiddenException(AUTH_ERRORS.SESSION_EXPIRED);
    }

    const isValid = await bcrypt.compare(
      JWT_CONSTANTS.REFRESH_TOKEN_PREFIX + refreshToken,
      session.refreshToken,
    );

    if (!isValid) {
      throw new ForbiddenException(AUTH_ERRORS.REFRESH_TOKEN_INVALID);
    }

    return session;
  }

  async invalidateSession(idSession: string, idUser: string): Promise<void> {
    const session = await this.sessionRepository.findOne({
      where: { idSession, idUser },
    });

    if (!session) {
      throw new NotFoundException(AUTH_ERRORS.SESSION_NOT_FOUND);
    }

    session.isActive = false;
    await this.sessionRepository.save(session);
  }

  async invalidateAllUserSessions(idUser: string): Promise<void> {
    await this.sessionRepository.update(
      { idUser, isActive: true },
      { isActive: false },
    );
  }

  async cleanupExpiredSessions(): Promise<void> {
    await this.sessionRepository.update(
      { isActive: true, expiresAt: LessThan(new Date()) },
      { isActive: false },
    );
  }

  generateSessionId(): string {
    return crypto.randomUUID();
  }
}
