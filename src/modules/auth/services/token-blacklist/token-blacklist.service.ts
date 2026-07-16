import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { RedisService } from '../../../redis/redis.service';

@Injectable()
export class TokenBlacklistService {
  constructor(private readonly redisService: RedisService) {}

  private blacklistKey(token: string): string {
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    return `blacklist:${hash}`;
  }

  async add(token: string, expiresIn: number = 86400): Promise<void> {
    await this.redisService.set(this.blacklistKey(token), '1', expiresIn);
  }

  async has(token: string): Promise<boolean> {
    return this.redisService.exists(this.blacklistKey(token));
  }

  async cleanup(): Promise<void> {
    const keys = await this.redisService.getClient().keys('blacklist:*');

    for (const key of keys) {
      const ttl = await this.redisService.getClient().ttl(key);
      if (ttl <= 0) {
        await this.redisService.del(key);
      }
    }
  }
}
