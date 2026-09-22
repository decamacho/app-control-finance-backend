import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { RedisService } from '../../../redis/redis.service';
import { SessionService } from './session.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-refresh-token'),
  compare: jest.fn(),
}));

import * as bcrypt from 'bcrypt';

describe('SessionService', () => {
  let service: SessionService;
  let redisService: jest.Mocked<RedisService>;

  const mockRedis = {
    hset: jest.fn().mockResolvedValue(undefined),
    hgetall: jest.fn(),
    hget: jest.fn().mockResolvedValue(null),
    expire: jest.fn().mockResolvedValue(undefined),
    sadd: jest.fn().mockResolvedValue(undefined),
    srem: jest.fn().mockResolvedValue(undefined),
    smembers: jest.fn(),
    del: jest.fn().mockResolvedValue(undefined),
    getClient: jest.fn().mockReturnValue({
      keys: jest.fn().mockResolvedValue([]),
      ttl: jest.fn().mockResolvedValue(-1),
    }),
  };

  const mockSessionData = {
    idSession: 'session-uuid',
    idUser: 'user-uuid',
    deviceInfo: 'Chrome on Windows',
    ipAddress: '192.168.1.1',
    refreshTokenHash: 'hashed-refresh-token',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    isActive: 'true',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        {
          provide: RedisService,
          useValue: mockRedis,
        },
      ],
    }).compile();

    service = module.get<SessionService>(SessionService);
    redisService = module.get(RedisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new session in Redis', async () => {
      const params = {
        idUser: 'user-uuid',
        deviceInfo: 'Chrome on Windows',
        ipAddress: '192.168.1.1',
      };

      const result = await service.create(params, 'refresh-token-value');

      expect(result.idSession).toBeDefined();
      expect(redisService.hset).toHaveBeenCalled();
      expect(redisService.expire).toHaveBeenCalled();
      expect(redisService.sadd).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return session data when found', async () => {
      mockRedis.hgetall.mockResolvedValue(mockSessionData);

      const result = await service.findById('session-uuid');

      expect(result).toBeDefined();
      expect(result?.idUser).toBe('user-uuid');
    });

    it('should return null when session not found', async () => {
      mockRedis.hgetall.mockResolvedValue({});

      const result = await service.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('should return active sessions for user', async () => {
      mockRedis.smembers.mockResolvedValue(['session-uuid']);
      mockRedis.hgetall.mockResolvedValue(mockSessionData);

      const result = await service.findByUserId('user-uuid');

      expect(result).toHaveLength(1);
      expect(result[0].idSession).toBe('session-uuid');
    });

    it('should prune orphan session ids from the user set', async () => {
      mockRedis.smembers.mockResolvedValue(['session-uuid']);
      mockRedis.hgetall.mockResolvedValue({});

      const result = await service.findByUserId('user-uuid');

      expect(result).toHaveLength(0);
      expect(redisService.srem).toHaveBeenCalledWith(
        'user_sessions:user-uuid',
        'session-uuid',
      );
    });
  });

  describe('validateRefreshToken', () => {
    it('should return session data for valid refresh token', async () => {
      mockRedis.hgetall.mockResolvedValue(mockSessionData);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      const result = await service.validateRefreshToken(
        'session-uuid',
        'valid-refresh-token',
      );

      expect(result.isActive).toBe(true);
    });

    it('should throw NotFoundException when session not found', async () => {
      mockRedis.hgetall.mockResolvedValue({});

      await expect(
        service.validateRefreshToken('non-existent', 'token'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when session expired', async () => {
      const expiredSession = {
        ...mockSessionData,
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      };
      mockRedis.hgetall.mockResolvedValue(expiredSession);

      await expect(
        service.validateRefreshToken('session-uuid', 'token'),
      ).rejects.toThrow(ForbiddenException);

      expect(redisService.del).toHaveBeenCalledWith('session:session-uuid');
      expect(redisService.srem).toHaveBeenCalledWith(
        'user_sessions:user-uuid',
        'session-uuid',
      );
    });

    it('should throw ForbiddenException for invalid refresh token', async () => {
      mockRedis.hgetall.mockResolvedValue(mockSessionData);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(
        service.validateRefreshToken('session-uuid', 'wrong-token'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('invalidateSession', () => {
    it('should delete the session from Redis', async () => {
      mockRedis.hgetall.mockResolvedValue(mockSessionData);

      await service.invalidateSession('session-uuid', 'user-uuid');

      expect(redisService.del).toHaveBeenCalledWith('session:session-uuid');
      expect(redisService.srem).toHaveBeenCalledWith(
        'user_sessions:user-uuid',
        'session-uuid',
      );
    });

    it('should throw NotFoundException when session not found', async () => {
      mockRedis.hgetall.mockResolvedValue({});

      await expect(
        service.invalidateSession('non-existent', 'user-uuid'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('invalidateAllUserSessions', () => {
    it('should delete all user sessions from Redis', async () => {
      mockRedis.smembers.mockResolvedValue(['session-uuid', 'session-uuid-2']);

      mockRedis.del.mockClear();

      await service.invalidateAllUserSessions('user-uuid');

      expect(redisService.del).toHaveBeenCalledTimes(3);
      expect(redisService.del).toHaveBeenCalledWith('session:session-uuid');
      expect(redisService.del).toHaveBeenCalledWith('session:session-uuid-2');
      expect(redisService.del).toHaveBeenCalledWith('user_sessions:user-uuid');
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should clean up expired sessions', async () => {
      const mockClient = {
        keys: jest.fn().mockResolvedValue(['session:uuid-1']),
        ttl: jest.fn().mockResolvedValue(-2),
      };
      mockRedis.getClient.mockReturnValue(mockClient);
      mockRedis.hget.mockResolvedValue('user-uuid');

      await service.cleanupExpiredSessions();

      expect(redisService.del).toHaveBeenCalled();
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
