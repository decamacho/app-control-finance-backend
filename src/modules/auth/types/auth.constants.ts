export const JWT_CONSTANTS = {
  SECRET:
    process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
  ACCESS_EXPIRES_IN: '15m',
  REFRESH_EXPIRES_IN: '7d',
  REFRESH_TOKEN_PREFIX: 'refresh_',
} as const;

export const IS_PUBLIC_KEY = 'isPublic';

export const AUTH_ERRORS = {
  TOKEN_EXPIRED: 'Token has expired',
  TOKEN_INVALID: 'Invalid token',
  REFRESH_TOKEN_INVALID: 'Invalid or expired refresh token',
  SESSION_NOT_FOUND: 'Session not found',
  SESSION_EXPIRED: 'Session has expired',
  SESSION_NO_FOUND_ACTIVE: 'User not found or inactive',
} as const;

export const STATE_USER = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;
