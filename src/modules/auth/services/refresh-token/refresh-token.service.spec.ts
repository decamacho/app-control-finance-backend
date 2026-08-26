import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '../jwt/jwt.service';
import { SessionService } from '../session/session.service';
import { RefreshTokenService } from './refresh-token.service';
import { User } from '../../../users/entities/user.entity';
import { RefreshPayload } from '../../interfaces/jwt-payload.interface';

describe('RefreshTokenService', () => {
  let service: RefreshTokenService;
  let jwtService: jest.Mocked<JwtService>;
  let sessionService: jest.Mocked<SessionService>;
  let userRepository: jest.Mocked<Repository<User>>;

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

  const mockSession = {
    idSession: 'session-uuid',
    idUser: 'user-uuid',
    isActive: true,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
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

    const mockUserRepository = {
      findOne: jest.fn(),
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
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<RefreshTokenService>(RefreshTokenService);
    jwtService = module.get(JwtService);
    sessionService = module.get(SessionService);
    userRepository = module.get(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('refresh', () => {
    it('should invalidate old session and create new one', async () => {
      const mockPayload: RefreshPayload = {
        sub: 'user-uuid',
        sessionId: 'session-uuid',
        type: 'refresh',
      };
      jwtService.verifyRefreshToken.mockReturnValue(mockPayload);
      userRepository.findOne.mockResolvedValue(mockUser);
      sessionService.validateRefreshToken.mockResolvedValue(mockSession);
      sessionService.generateSessionId.mockReturnValue('new-session-uuid');
      jwtService.generateTokenPair.mockReturnValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
      sessionService.create.mockResolvedValue({ idSession: 'new-session-uuid' });

      const result = await service.refresh(
        'valid-refresh-token',
        'Firefox on Windows',
        '127.0.0.1',
      );

      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
      expect(sessionService.invalidateSession).toHaveBeenCalledWith(
        'session-uuid',
        'user-uuid',
      );
      expect(sessionService.create).toHaveBeenCalledWith(
        {
          idUser: 'user-uuid',
          deviceInfo: 'Firefox on Windows',
          ipAddress: '127.0.0.1',
        },
        'new-refresh-token',
      );
    });

    it('should throw UnauthorizedException when user not found', async () => {
      jwtService.verifyRefreshToken.mockReturnValue({
        sub: 'non-existent-user',
        sessionId: 'session-uuid',
        type: 'refresh',
      });
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.refresh('token', 'device', 'ip'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw when session validation fails', async () => {
      jwtService.verifyRefreshToken.mockReturnValue({
        sub: 'user-uuid',
        sessionId: 'session-uuid',
        type: 'refresh',
      });
      userRepository.findOne.mockResolvedValue(mockUser);
      sessionService.validateRefreshToken.mockRejectedValue(
        new Error('Session not found'),
      );

      await expect(
        service.refresh('token', 'device', 'ip'),
      ).rejects.toThrow();
    });
  });
});
