import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../users/entities/user.entity';
import { SessionService } from './session.service';
import { Session } from '../../entities/session.entity';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-refresh-token'),
  compare: jest.fn(),
}));

import * as bcrypt from 'bcrypt';

describe('SessionService', () => {
  let service: SessionService;
  let sessionRepository: jest.Mocked<Repository<Session>>;

  const mockSession: Session = {
    idSession: 'session-uuid',
    idUser: 'user-uuid',
    deviceInfo: 'Chrome on Windows',
    ipAddress: '192.168.1.1',
    refreshToken: 'hashed-refresh-token',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    isActive: true,
    user: undefined as unknown as User,
  };

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        {
          provide: getRepositoryToken(Session),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<SessionService>(SessionService);
    sessionRepository = module.get(getRepositoryToken(Session));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new session', async () => {
      const params = {
        idUser: 'user-uuid',
        deviceInfo: 'Chrome on Windows',
        ipAddress: '192.168.1.1',
      };

      sessionRepository.create.mockReturnValue(mockSession);
      sessionRepository.save.mockResolvedValue(mockSession);

      const result = await service.create(params, 'refresh-token-value');

      expect(result).toEqual(mockSession);
      expect(sessionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          idUser: 'user-uuid',
          deviceInfo: 'Chrome on Windows',
          ipAddress: '192.168.1.1',
          isActive: true,
        }),
      );
      expect(sessionRepository.save).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return a session by id', async () => {
      sessionRepository.findOne.mockResolvedValue(mockSession);

      const result = await service.findById('session-uuid');

      expect(result).toEqual(mockSession);
    });

    it('should return null when session not found', async () => {
      sessionRepository.findOne.mockResolvedValue(null);

      const result = await service.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('should return active sessions for user', async () => {
      sessionRepository.find.mockResolvedValue([mockSession]);

      const result = await service.findByUserId('user-uuid');

      expect(result).toHaveLength(1);
      expect(sessionRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { idUser: 'user-uuid', isActive: true },
        }),
      );
    });
  });

  describe('validateRefreshToken', () => {
    it('should return session for valid refresh token', async () => {
      sessionRepository.findOne.mockResolvedValue(mockSession);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      const result = await service.validateRefreshToken(
        'session-uuid',
        'valid-refresh-token',
      );

      expect(result).toEqual(mockSession);
    });

    it('should throw NotFoundException when session not found', async () => {
      sessionRepository.findOne.mockResolvedValue(null);

      await expect(
        service.validateRefreshToken('non-existent', 'token'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when session expired', async () => {
      const expiredSession = {
        ...mockSession,
        expiresAt: new Date(Date.now() - 1000),
      };
      sessionRepository.findOne.mockResolvedValue(expiredSession);

      await expect(
        service.validateRefreshToken('session-uuid', 'token'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for invalid refresh token', async () => {
      sessionRepository.findOne.mockResolvedValue(mockSession);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(
        service.validateRefreshToken('session-uuid', 'wrong-token'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('invalidateSession', () => {
    it('should mark session as inactive', async () => {
      sessionRepository.findOne.mockResolvedValue(mockSession);
      sessionRepository.save.mockResolvedValue({
        ...mockSession,
        isActive: false,
      });

      await service.invalidateSession('session-uuid', 'user-uuid');

      expect(sessionRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
    });

    it('should throw NotFoundException when session not found', async () => {
      sessionRepository.findOne.mockResolvedValue(null);

      await expect(
        service.invalidateSession('non-existent', 'user-uuid'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('invalidateAllUserSessions', () => {
    it('should mark all user sessions as inactive', async () => {
      sessionRepository.update.mockResolvedValue({
        affected: 2,
        raw: [],
        generatedMaps: [],
      });

      await service.invalidateAllUserSessions('user-uuid');

      expect(sessionRepository.update).toHaveBeenCalledWith(
        { idUser: 'user-uuid', isActive: true },
        { isActive: false },
      );
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should mark expired sessions as inactive', async () => {
      sessionRepository.update.mockResolvedValue({
        affected: 1,
        raw: [],
        generatedMaps: [],
      });

      await service.cleanupExpiredSessions();

      expect(sessionRepository.update).toHaveBeenCalled();
    });
  });

  describe('generateSessionId', () => {
    it('should generate a UUID', () => {
      const result = service.generateSessionId();
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });
});
