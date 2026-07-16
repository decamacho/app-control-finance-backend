import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { User } from '../../../users/entities/user.entity';
import { RedisService } from '../../../redis/redis.service';
import type { IEmailProvider } from '../../interfaces/email-provider.interface';
import { EMAIL_PROVIDER_TOKEN } from '../../interfaces/email-provider.interface';
import { EMAIL_VERIFICATION, AUTH_ERRORS } from '../../types/auth.constants';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);
  private readonly verificationUrl: string;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly redisService: RedisService,
    @Inject(EMAIL_PROVIDER_TOKEN)
    private readonly emailProvider: IEmailProvider,
    private readonly configService: ConfigService,
  ) {
    this.verificationUrl = this.configService.get<string>(
      'VERIFICATION_URL',
      'http://localhost:3000/auth/verify-email',
    );
  }

  private verifyKey(token: string): string {
    return `${EMAIL_VERIFICATION.REDIS_PREFIX}${token}`;
  }

  async generateAndSendToken(userId: string, email: string): Promise<string> {
    const token = crypto.randomUUID();
    const key = this.verifyKey(token);

    await this.redisService.set(
      key,
      userId,
      EMAIL_VERIFICATION.TOKEN_TTL_SECONDS,
    );

    await this.sendVerificationEmail(email, token);

    return token;
  }

  async verifyEmail(token: string): Promise<User> {
    const key = this.verifyKey(token);
    const userId = await this.redisService.get(key);

    if (!userId) {
      throw new BadRequestException(AUTH_ERRORS.VERIFICATION_TOKEN_INVALID);
    }

    const user = await this.userRepository.findOne({
      where: { idUser: userId },
      relations: { role: true },
    });

    if (!user) {
      throw new NotFoundException(AUTH_ERRORS.USER_NOT_FOUND);
    }

    if (user.isVerifyUser) {
      throw new BadRequestException(AUTH_ERRORS.VERIFICATION_ALREADY_DONE);
    }

    user.statusUser = 'ACTIVE';
    user.isVerifyUser = true;
    await this.userRepository.save(user);

    await this.redisService.del(key);

    return user;
  }

  private async sendVerificationEmail(
    to: string,
    token: string,
  ): Promise<void> {
    const link = `${this.verificationUrl}/${token}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to Wallet AI!</h2>
        <p>Thank you for registering. Please verify your email address by clicking the link below:</p>
        <a href="${link}"
           style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Verify Email
        </a>
        <p>This link will expire in 24 hours.</p>
        <p>If you did not create an account, please ignore this email.</p>
      </div>
    `;

    try {
      await this.emailProvider.sendMail({
        to,
        subject: 'Verify your email - Wallet AI',
        html,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send verification email to ${to}: ${(error as Error).message}`,
      );
    }
  }
}
