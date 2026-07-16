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
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthService } from './services/auth/auth.service';
import { JwtService } from './services/jwt/jwt.service';
import { RefreshTokenService } from './services/refresh-token/refresh-token.service';
import { SessionService } from './services/session/session.service';
import { TokenBlacklistService } from './services/token-blacklist/token-blacklist.service';
import { LoginDto } from './dto/login.dto';
import { Public } from '../../common/decorators/public.decorator';
import { User } from '../users/entities/user.entity';

interface AuthenticatedRequest extends Request {
  user: User;
}

@Controller('auth')
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly sessionService: SessionService,
    private readonly tokenBlacklistService: TokenBlacklistService,
  ) {}

  @Public()
  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
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
      loginDto,
      deviceInfo,
      ipAddress,
    );

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: true,
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
      this.tokenBlacklistService.add(token, 900);
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
