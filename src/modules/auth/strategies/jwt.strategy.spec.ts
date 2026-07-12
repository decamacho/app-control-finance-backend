import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtStrategy } from './jwt.strategy';
import { User } from '../../users/entities/user.entity';
import { Role } from '../../users/entities/role.entity';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let userRepository: jest.Mocked<Repository<User>>;

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

  beforeEach(async () => {
    const mockRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    userRepository = module.get(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return user without password for valid active user', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await strategy.validate({
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

    it('should throw UnauthorizedException when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        strategy.validate({
          sub: 'user-uuid',
          email: 'test@example.com',
          role: 'USER',
          sessionId: 'session-uuid',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      userRepository.findOne.mockResolvedValue({
        ...mockUser,
        statusUser: 'INACTIVE',
      });

      await expect(
        strategy.validate({
          sub: 'user-uuid',
          email: 'test@example.com',
          role: 'USER',
          sessionId: 'session-uuid',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
