import { Injectable } from '@nestjs/common';

interface BlacklistEntry {
  token: string;
  expiresAt: Date;
}

@Injectable()
export class TokenBlacklistService {
  private readonly blacklist: Map<string, BlacklistEntry> = new Map();

  add(token: string, expiresIn: number = 86400): void {
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    this.blacklist.set(token, { token, expiresAt });
  }

  has(token: string): boolean {
    const entry = this.blacklist.get(token);
    if (!entry) {
      return false;
    }

    if (new Date() > entry.expiresAt) {
      this.blacklist.delete(token);
      return false;
    }

    return true;
  }

  cleanup(): void {
    const now = new Date();
    for (const [token, entry] of this.blacklist.entries()) {
      if (now > entry.expiresAt) {
        this.blacklist.delete(token);
      }
    }
  }
}
