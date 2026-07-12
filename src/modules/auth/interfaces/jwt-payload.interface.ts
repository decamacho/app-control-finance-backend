export interface JwtPayload {
  sub: string; // userId
  email: string;
  role: string;
  sessionId: string;
  iat?: number;
  exp?: number;
}

export interface RefreshPayload {
  sub: string; // userId
  sessionId: string;
  type: 'refresh';
  iat?: number;
  exp?: number;
}
