import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Request } from 'express';
import { JwtStrategy } from './jwt.strategy';
import { User } from '../../users/entities/user.entity';
import { Role } from '../../users/entities/role.entity';
import { TokenBlacklistService } from '../services/token-blacklist/token-blacklist.service';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let userRepository: jest.Mocked<Repository<User>>;
  let tokenBlacklistService: jest.Mocked<TokenBlacklistService>;

  const mockRole: Role = {
    idRole: 'role-uuid',
    nameRole: 'USER',
    stateRole: true,
    createdAt: new Date(),
    users: [],
  };

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
    role: mockRole,
    walletsUsers: [],
    customCategories: [],
  };

  const mockRequest = {
    headers: {
      authorization: 'Bearer valid-token',
    },
  } as Request;

  beforeEach(async () => {
    const mockRepository = {
      findOne: jest.fn(),
    };

    const mockBlacklist = {
      has: jest.fn(),
      add: jest.fn(),
      cleanup: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
        {
          provide: TokenBlacklistService,
          useValue: mockBlacklist,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    userRepository = module.get(getRepositoryToken(User));
    tokenBlacklistService = module.get(TokenBlacklistService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return user without password for valid active user', async () => {
      tokenBlacklistService.has.mockReturnValue(false);
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await strategy.validate(mockRequest, {
        sub: 'user-uuid',
        email: 'test@example.com',
        role: 'USER',
        sessionId: 'session-uuid',
      });

      expect(result.idUser).toBe('user-uuid');
      expect(result.emailUser).toBe('test@example.com');
      expect(result).not.toHaveProperty('passwordUser');
      expect(result.role.nameRole).toBe('USER');
    });

    it('should throw UnauthorizedException when token is blacklisted', async () => {
      tokenBlacklistService.has.mockReturnValue(true);

      await expect(
        strategy.validate(mockRequest, {
          sub: 'user-uuid',
          email: 'test@example.com',
          role: 'USER',
          sessionId: 'session-uuid',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      tokenBlacklistService.has.mockReturnValue(false);
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        strategy.validate(mockRequest, {
          sub: 'user-uuid',
          email: 'test@example.com',
          role: 'USER',
          sessionId: 'session-uuid',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      tokenBlacklistService.has.mockReturnValue(false);
      userRepository.findOne.mockResolvedValue({
        ...mockUser,
        statusUser: 'INACTIVE',
      });

      await expect(
        strategy.validate(mockRequest, {
          sub: 'user-uuid',
          email: 'test@example.com',
          role: 'USER',
          sessionId: 'session-uuid',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
