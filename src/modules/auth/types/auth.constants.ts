export const JWT_CONSTANTS = {
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
  EMAIL_ALREADY_EXISTS: 'Email already exists',
  USER_NOT_FOUND: 'User not found',
  PENDING_VERIFY: 'Email not verified. Please verify your email',
  VERIFICATION_TOKEN_INVALID: 'Invalid or expired verification token',
  VERIFICATION_ALREADY_DONE: 'Email already verified',
  CURRENT_PASSWORD_INCORRECT: 'Current password is incorrect',
  SAME_PASSWORD: 'New password must be different from current password',
  DEFAULT_ROLE_NOT_FOUND: 'Default role not found. Contact an administrator',
  USER_BLOCKED: 'User account is blocked',
  EMAIL_SEND_FAILED: 'Could not send the email. Please try again later',
} as const;

export const STATE_USER = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  PENDING_VERIFY: 'PENDING_VERIFY',
  BLOCKED: 'BLOCKED',
} as const;

export const EMAIL_VERIFICATION = {
  TOKEN_TTL_SECONDS: 24 * 60 * 60,
  REDIS_PREFIX: 'verify:',
} as const;
