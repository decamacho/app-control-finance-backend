import { Module, Global, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { RedisModule } from '../redis/redis.module';
import { User } from '../users/entities/user.entity';
import { Role } from '../users/entities/role.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './services/auth/auth.service';
import { JwtService } from './services/jwt/jwt.service';
import { RefreshTokenService } from './services/refresh-token/refresh-token.service';
import { SessionService } from './services/session/session.service';
import { TokenBlacklistService } from './services/token-blacklist/token-blacklist.service';
import { EmailVerificationService } from './services/email-verification/email-verification.service';
import { SendgridProvider } from './services/providers/sendgrid.provider';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { ActiveUserGuard } from './guards/active-user.guard';
import { JWT_CONSTANTS } from './types/auth.constants';
import { EMAIL_PROVIDER_TOKEN } from './interfaces/email-provider.interface';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([User, Role]),
    forwardRef(() => UsersModule),
    RedisModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET')!,
        signOptions: { expiresIn: JWT_CONSTANTS.ACCESS_EXPIRES_IN },
      }),
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtService,
    RefreshTokenService,
    SessionService,
    TokenBlacklistService,
    EmailVerificationService,
    {
      provide: EMAIL_PROVIDER_TOKEN,
      useClass: SendgridProvider,
    },
    SendgridProvider,
    JwtStrategy,
    LocalStrategy,
    JwtAuthGuard,
    RolesGuard,
    ActiveUserGuard,
  ],
  exports: [
    AuthService,
    JwtService,
    SessionService,
    TokenBlacklistService,
    JwtAuthGuard,
    RolesGuard,
    ActiveUserGuard,
    JwtStrategy,
  ],
})
export class AuthModule {}
