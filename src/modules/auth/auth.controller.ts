import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
  Res,
  ParseUUIDPipe,
  UnauthorizedException,
  HttpCode,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthService } from './services/auth/auth.service';
import { JwtService } from './services/jwt/jwt.service';
import { RefreshTokenService } from './services/refresh-token/refresh-token.service';
import { SessionService } from './services/session/session.service';
import { TokenBlacklistService } from './services/token-blacklist/token-blacklist.service';
import { LoginAuthDto } from './dto/login-auth.dto';
import { RegisterAuthDto } from './dto/register-auth.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ResendVerifyDto } from './dto/resend-verify.dto';
import { Public } from '../../common/decorators/public.decorator';
import { User } from '../users/entities/user.entity';

interface AuthenticatedRequest extends Request {
  user: User;
}

@Controller('auth')
@UseGuards(JwtAuthGuard)
export class AuthController {
  private readonly cookieSecure: boolean;

  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly sessionService: SessionService,
    private readonly tokenBlacklistService: TokenBlacklistService,
    private readonly configService: ConfigService,
  ) {
    const cookieSecureEnv = this.configService.get<string>('COOKIE_SECURE');
    this.cookieSecure =
      cookieSecureEnv !== undefined
        ? cookieSecureEnv === 'true'
        : this.configService.get<string>('NODE_ENV', 'development') ===
          'production';
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('register')
  async register(@Body() registerAuthDto: RegisterAuthDto) {
    const result = await this.authService.register(registerAuthDto);
    return {
      data: result,
      message:
        result.message ??
        'User registered successfully. Please check your email to verify your account.',
    };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  async login(
    @Body() loginAuthDto: LoginAuthDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const deviceInfo = (req.headers['user-agent'] || 'unknown').substring(
      0,
      255,
    );
    const ipAddress = (
      req.ip ||
      req.socket?.remoteAddress ||
      'unknown'
    ).substring(0, 45);

    const result = await this.authService.login(
      loginAuthDto,
      deviceInfo,
      ipAddress,
    );

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: this.cookieSecure,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/auth/refresh',
    });

    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Public()
  @Post('refresh')
  async refresh(@Req() req: Request) {
    const refreshToken = req.cookies?.refreshToken as string | undefined;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    return this.refreshTokenService.refresh(refreshToken);
  }

  @Public()
  @Get('verify-email/:token')
  async verifyEmail(@Param('token') token: string) {
    const result = await this.authService.verifyEmail(token);
    return {
      data: result,
      message: `Email ${result.emailUser} verified successfully`,
    };
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('resend-verify')
  @HttpCode(200)
  async resendVerify(@Body() resendVerifyDto: ResendVerifyDto) {
    const result = await this.authService.resendVerification(
      resendVerifyDto.emailUser,
    );
    return {
      data: result,
      message: 'Verification email sent successfully',
    };
  }

  @Post('change-password')
  async changePassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const result = await this.authService.changePassword(
      req.user.idUser,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
    );

    await this.sessionService.invalidateAllUserSessions(req.user.idUser);

    const authHeader = req.headers.authorization;
    const token = this.jwtService.extractTokenFromHeader(authHeader);
    if (token) {
      await this.tokenBlacklistService.add(token, 900);
    }

    return {
      data: result,
      message:
        'Password changed successfully. Please sign in again with your new password.',
    };
  }

  @Get('profile')
  async getProfile(@Req() req: AuthenticatedRequest) {
    const result = await this.authService.getProfile(req.user.idUser);
    return {
      data: result,
      message: 'Profile retrieved successfully',
    };
  }

  @Get('sessions')
  async getSessions(@Req() req: AuthenticatedRequest) {
    return this.sessionService.findByUserId(req.user.idUser);
  }

  @Delete('sessions/:id')
  async deleteSession(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.sessionService.invalidateSession(id, req.user.idUser);
    return { data: null, message: 'Session closed successfully' };
  }

  @Delete('sessions')
  async deleteAllSessions(@Req() req: AuthenticatedRequest) {
    await this.sessionService.invalidateAllUserSessions(req.user.idUser);

    const authHeader = req.headers.authorization;
    const token = this.jwtService.extractTokenFromHeader(authHeader);
    if (token) {
      await this.tokenBlacklistService.add(token, 900);
    }

    return { data: null, message: 'All sessions closed successfully' };
  }

  @Public()
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.refreshToken as string | undefined;

    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }

    res.clearCookie('refreshToken', { path: '/auth/refresh' });

    return { data: null, message: 'Logged out successfully' };
  }
}
