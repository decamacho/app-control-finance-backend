import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '../jwt/jwt.service';
import { SessionService } from '../session/session.service';
import { RefreshTokenService } from './refresh-token.service';
import { User } from '../../../users/entities/user.entity';
import { Session } from '../../entities/session.entity';
import { RefreshPayload } from '../../interfaces/jwt-payload.interface';

describe('RefreshTokenService', () => {
  let service: RefreshTokenService;
  let jwtService: jest.Mocked<JwtService>;
  let sessionService: jest.Mocked<SessionService>;

  const mockUser: User = {
    idUser: 'user-uuid',
    nameUser: 'Test',
    firstNameUser: 'Test',
    lastNameUser: 'User',
    emailUser: 'test@example.com',
    passwordUser: 'hashed-password',
    phoneNumberUser: null,
    googleIdUser: null,
    statusUser: 'ACTIVE',
    isVerifyUser: true,
    countryUser: null,
    currencyDefault: 'COP',
    lastLoginUser: null,
    createdAt: new Date(),
    modifyAt: new Date(),
    role: {
      idRole: 'role-uuid',
      nameRole: 'USER',
      stateRole: true,
      createdAt: new Date(),
      users: [],
    },
    walletsUsers: [],
    customCategories: [],
  };

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
    const mockJwtService = {
      verifyRefreshToken: jest.fn(),
      generateTokenPair: jest.fn(),
    };

    const mockSessionService = {
      validateRefreshToken: jest.fn(),
      generateSessionId: jest.fn(),
      create: jest.fn(),
      invalidateSession: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokenService,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: SessionService,
          useValue: mockSessionService,
        },
      ],
    }).compile();

    service = module.get<RefreshTokenService>(RefreshTokenService);
    jwtService = module.get(JwtService);
    sessionService = module.get(SessionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('refresh', () => {
    it('should return new token pair for valid refresh token', async () => {
      const mockPayload: RefreshPayload = {
        sub: 'user-uuid',
        sessionId: 'session-uuid',
        type: 'refresh',
      };
      jwtService.verifyRefreshToken.mockReturnValue(mockPayload);
      sessionService.validateRefreshToken.mockResolvedValue(mockSession);
      jwtService.generateTokenPair.mockReturnValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });

      const result = await service.refresh('valid-refresh-token', mockUser);

      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
    });

    it('should throw UnauthorizedException when user id mismatch', async () => {
      jwtService.verifyRefreshToken.mockReturnValue({
        sub: 'different-user',
        sessionId: 'session-uuid',
        type: 'refresh',
      });

      await expect(service.refresh('token', mockUser)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw ForbiddenException when session is inactive', async () => {
      jwtService.verifyRefreshToken.mockReturnValue({
        sub: 'user-uuid',
        sessionId: 'session-uuid',
        type: 'refresh',
      });

      sessionService.validateRefreshToken.mockResolvedValue({
        ...mockSession,
        isActive: false,
      });

      await expect(service.refresh('token', mockUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('rotateRefreshToken', () => {
    it('should rotate refresh token and create new session', async () => {
      jwtService.verifyRefreshToken.mockReturnValue({
        sub: 'user-uuid',
        sessionId: 'session-uuid',
        type: 'refresh',
      });

      sessionService.validateRefreshToken.mockResolvedValue(mockSession);
      sessionService.generateSessionId.mockReturnValue('new-session-uuid');
      jwtService.generateTokenPair.mockReturnValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
      sessionService.create.mockResolvedValue(mockSession);

      const result = await service.rotateRefreshToken(
        'old-refresh-token',
        mockUser,
        'Firefox on Linux',
        '10.0.0.1',
      );

      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
      expect(sessionService.invalidateSession).toHaveBeenCalled();
      expect(sessionService.create).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when user id mismatch', async () => {
      jwtService.verifyRefreshToken.mockReturnValue({
        sub: 'different-user',
        sessionId: 'session-uuid',
        type: 'refresh',
      });

      await expect(
        service.rotateRefreshToken('token', mockUser, 'device', 'ip'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
