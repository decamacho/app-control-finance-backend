import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { JwtService } from './jwt.service';
import {
  JwtPayload,
  RefreshPayload,
} from '../interfaces/jwt-payload.interface';

describe('JwtService', () => {
  let service: JwtService;
  let nestJwtService: jest.Mocked<NestJwtService>;

  const mockPayload: JwtPayload = {
    sub: 'user-uuid',
    email: 'test@example.com',
    role: 'USER',
    sessionId: 'session-uuid',
  };

  const mockRefreshPayload: RefreshPayload = {
    sub: 'user-uuid',
    sessionId: 'session-uuid',
    type: 'refresh',
  };

  beforeEach(async () => {
    const mockNestJwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtService,
        {
          provide: NestJwtService,
          useValue: mockNestJwtService,
        },
      ],
    }).compile();

    service = module.get<JwtService>(JwtService);
    nestJwtService = module.get<NestJwtService>(
      NestJwtService,
    ) as jest.Mocked<NestJwtService>;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateAccessToken', () => {
    it('should generate an access token', () => {
      const expectedToken = 'access-token-123';
      nestJwtService.sign.mockReturnValue(expectedToken);

      const result = service.generateAccessToken(mockPayload);

      expect(result).toBe(expectedToken);

      expect(nestJwtService.sign).toHaveBeenCalledWith(mockPayload, {
        secret: expect.any(String) as string,
        expiresIn: '15m',
      });
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a refresh token', () => {
      const expectedToken = 'refresh-token-123';
      nestJwtService.sign.mockReturnValue(expectedToken);

      const result = service.generateRefreshToken(mockRefreshPayload);

      expect(result).toBe(expectedToken);

      expect(nestJwtService.sign).toHaveBeenCalledWith(mockRefreshPayload, {
        secret: expect.any(String) as string,
        expiresIn: '7d',
      });
    });
  });

  describe('generateTokenPair', () => {
    it('should generate both access and refresh tokens', () => {
      const accessToken = 'access-token-123';
      const refreshToken = 'refresh-token-456';

      nestJwtService.sign
        .mockReturnValueOnce(accessToken)
        .mockReturnValueOnce(refreshToken);

      const result = service.generateTokenPair(
        'user-uuid',
        'test@example.com',
        'USER',
        'session-uuid',
      );

      expect(result).toEqual({ accessToken, refreshToken });
      expect(nestJwtService.sign).toHaveBeenCalledTimes(2);
    });
  });

  describe('verifyAccessToken', () => {
    it('should return payload for valid token', () => {
      nestJwtService.verify.mockReturnValue(mockPayload);

      const result = service.verifyAccessToken('valid-token');

      expect(result).toEqual(mockPayload);
    });

    it('should throw UnauthorizedException for expired token', () => {
      const error = new Error('TokenExpiredError');
      error.name = 'TokenExpiredError';
      nestJwtService.verify.mockImplementation(() => {
        throw error;
      });

      expect(() => service.verifyAccessToken('expired-token')).toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for invalid token', () => {
      nestJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      expect(() => service.verifyAccessToken('invalid-token')).toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('verifyRefreshToken', () => {
    it('should return payload for valid refresh token', () => {
      nestJwtService.verify.mockReturnValue(mockRefreshPayload);

      const result = service.verifyRefreshToken('valid-refresh-token');

      expect(result).toEqual(mockRefreshPayload);
    });

    it('should throw UnauthorizedException for expired refresh token', () => {
      const error = new Error('TokenExpiredError');
      error.name = 'TokenExpiredError';
      nestJwtService.verify.mockImplementation(() => {
        throw error;
      });

      expect(() => service.verifyRefreshToken('expired-token')).toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for invalid refresh token', () => {
      nestJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      expect(() => service.verifyRefreshToken('invalid-token')).toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('generateTokenPair', () => {
    it('should generate both access and refresh tokens', () => {
      const accessToken = 'access-token-123';
      const refreshToken = 'refresh-token-456';

      nestJwtService.sign
        .mockReturnValueOnce(accessToken)
        .mockReturnValueOnce(refreshToken);

      const result = service.generateTokenPair(
        'user-uuid',
        'test@example.com',
        'USER',
        'session-uuid',
      );

      expect(result).toEqual({ accessToken, refreshToken });
      expect(nestJwtService.sign).toHaveBeenCalledTimes(2);
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from Bearer header', () => {
      const result = service.extractTokenFromHeader('Bearer my-token');
      expect(result).toBe('my-token');
    });

    it('should return null for missing header', () => {
      expect(service.extractTokenFromHeader(undefined)).toBeNull();
    });

    it('should return null for non-Bearer header', () => {
      expect(service.extractTokenFromHeader('Basic token')).toBeNull();
    });
  });
});
