import { Test, TestingModule } from '@nestjs/testing';
import { TokenBlacklistService } from './token-blacklist.service';

describe('TokenBlacklistService', () => {
  let service: TokenBlacklistService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TokenBlacklistService],
    }).compile();

    service = module.get<TokenBlacklistService>(TokenBlacklistService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('add', () => {
    it('should add a token to the blacklist', () => {
      service.add('token-123');
      expect(service.has('token-123')).toBe(true);
    });

    it('should add a token with custom expiration', () => {
      service.add('token-456', 1);
      expect(service.has('token-456')).toBe(true);
    });
  });

  describe('has', () => {
    it('should return false for token not in blacklist', () => {
      expect(service.has('non-existent-token')).toBe(false);
    });

    it('should return true for token in blacklist', () => {
      service.add('token-123');
      expect(service.has('token-123')).toBe(true);
    });

    it('should return false for expired token', () => {
      jest.useFakeTimers();
      service.add('token-expired', 1);
      jest.advanceTimersByTime(2000);
      expect(service.has('token-expired')).toBe(false);
      jest.useRealTimers();
    });
  });

  describe('cleanup', () => {
    it('should remove expired tokens', () => {
      jest.useFakeTimers();
      service.add('token-valid', 60);
      service.add('token-expired', 1);
      jest.advanceTimersByTime(2000);

      service.cleanup();

      expect(service.has('token-valid')).toBe(true);
      expect(service.has('token-expired')).toBe(false);
      jest.useRealTimers();
    });
  });
});
