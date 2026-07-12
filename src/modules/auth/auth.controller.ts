import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtService } from './services/jwt/jwt.service';
import { AuthService } from './services/auth/auth.service';
import { RefreshTokenService } from './services/refresh-token/refresh-token.service';
import { SessionService } from './services/session/session.service';
import { TokenBlacklistService } from './services/token-blacklist/token-blacklist.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
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
  ) {
    const deviceInfo = (req.headers['user-agent'] || 'unknown').substring(0, 255);
    const ipAddress = (req.ip || req.socket?.remoteAddress || 'unknown').substring(0, 45);

    return this.authService.login(loginDto, deviceInfo, ipAddress);
  }

  @Post('refresh')
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const tokens = await this.refreshTokenService.refresh(
      refreshTokenDto.refreshToken,
      req.user,
    );
    return tokens;
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
    return { message: 'Session closed successfully' };
  }

  @Delete('sessions')
  async deleteAllSessions(@Req() req: AuthenticatedRequest) {
    await this.sessionService.invalidateAllUserSessions(req.user.idUser);
    return { message: 'All sessions closed successfully' };
  }

  @Post('logout')
  logout(@Req() req: AuthenticatedRequest) {
    const authHeader = req.headers.authorization;
    const token = this.jwtService.extractTokenFromHeader(authHeader);
    if (token) {
      this.tokenBlacklistService.add(token, 900);
    }
    return { message: 'Logged out successfully' };
  }
}
