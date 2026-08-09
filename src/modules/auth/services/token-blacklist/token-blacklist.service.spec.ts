import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from '../../../redis/redis.service';
import { TokenBlacklistService } from './token-blacklist.service';

describe('TokenBlacklistService', () => {
  let service: TokenBlacklistService;
  let redisService: jest.Mocked<RedisService>;

  const mockRedis = {
    set: jest.fn().mockResolvedValue(undefined),
    exists: jest.fn().mockResolvedValue(false),
    del: jest.fn().mockResolvedValue(undefined),
    getClient: jest.fn().mockReturnValue({
      keys: jest.fn().mockResolvedValue([]),
      ttl: jest.fn().mockResolvedValue(-1),
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenBlacklistService,
        {
          provide: RedisService,
          useValue: mockRedis,
        },
      ],
    }).compile();

    service = module.get<TokenBlacklistService>(TokenBlacklistService);
    redisService = module.get(RedisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('add', () => {
    it('should add a token to the blacklist', async () => {
      mockRedis.exists.mockResolvedValue(true);

      await service.add('token-123');

      expect(redisService.set).toHaveBeenCalledWith(
        expect.stringContaining('blacklist:'),
        '1',
        86400,
      );
      expect(await service.has('token-123')).toBe(true);
    });

    it('should add a token with custom expiration', async () => {
      mockRedis.exists.mockResolvedValue(true);

      await service.add('token-456', 1);

      expect(redisService.set).toHaveBeenCalledWith(
        expect.stringContaining('blacklist:'),
        '1',
        1,
      );
      expect(await service.has('token-456')).toBe(true);
    });
  });

  describe('has', () => {
    it('should return false for token not in blacklist', async () => {
      mockRedis.exists.mockResolvedValue(false);

      const result = await service.has('non-existent-token');

      expect(result).toBe(false);
    });

    it('should return true for token in blacklist', async () => {
      mockRedis.exists.mockResolvedValue(true);

      await service.add('token-123');
      const result = await service.has('token-123');

      expect(result).toBe(true);
    });

    it('should return false for expired token', async () => {
      mockRedis.exists.mockResolvedValue(false);

      const result = await service.has('token-expired');

      expect(result).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('should remove expired tokens', async () => {
      const mockClient = {
        keys: jest
          .fn()
          .mockResolvedValue(['blacklist:valid', 'blacklist:expired']),
        ttl: jest.fn().mockResolvedValueOnce(3000).mockResolvedValueOnce(-2),
      };
      mockRedis.getClient.mockReturnValue(mockClient);

      await service.cleanup();

      expect(redisService.del).toHaveBeenCalledTimes(1);
    });
  });
});
