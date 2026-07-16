---
name: 00-auth-access-control-01-jwt
description: Implementación de JWT - Generación, validación y refresh tokens
priority: high
parent: 00-auth-access-control
---

# Plan: JWT - Tokens de Acceso

## Objetivo

Implementar el sistema de JWT para gestión de sesiones seguras con:
- Access tokens de corta duración (15 min)
- Refresh tokens de larga duración (7 días)
- Renovación automática de tokens
- Lista negra para invalidación

## Tareas

| # | Descripción | Archivo Afectado | Dep |
|---|-------------|------------------|-----|
| 01 | Definir interfaces para payloads JWT | `src/modules/auth/interfaces/jwt-payload.interface.ts` | - |
| 02 | Crear constantes de configuración JWT | `src/modules/auth/types/auth.constants.ts` | - |
| 03 | Implementar JwtService (generación de tokens) | `src/modules/auth/services/jwt.service.ts` | 01, 02 |
| 04 | Implementar estrategia JWT (Passport) | `src/modules/auth/strategies/jwt.strategy.ts` | 03 |
| 05 | Crear JwtAuthGuard | `src/modules/auth/guards/jwt-auth.guard.ts` | 04 |
| 06 | Implementar RefreshTokenService | `src/modules/auth/services/refresh-token.service.ts` | 03 |
| 07 | Crear TokenBlacklistService | `src/modules/auth/services/token-blacklist.service.ts` | - |
| 08 | Crear entidad Session | `src/modules/auth/entities/session.entity.ts` | - |
| 09 | Implementar SessionService | `src/modules/auth/services/session.service.ts` | 08 |

## Archivos a Crear

```
src/modules/auth/
├── types/
│   └── auth.constants.ts        # JWT_SECRET, JWT_EXPIRES_IN
├── interfaces/
│   └── jwt-payload.interface.ts # JwtPayload interface
├── services/
│   ├── jwt.service.ts          # generate(), validate()
│   ├── refresh-token.service.ts # refresh()
│   └── token-blacklist.service.ts # add(), has()
├── strategies/
│   └── jwt.strategy.ts         # Passport JWT strategy
└── guards/
    └── jwt-auth.guard.ts      # @UseGuards(JwtAuthGuard)
```

## Testing

| Servicio | Casos |
|----------|-------|
| JwtService | Generación, validación, expiración |
| JwtStrategy | Token válido, token inválido, payload |

## Consideraciones

- Access token: 15 minutos (short-lived)
- Refresh token: 7 días (long-lived)
- Payload: userId, email, role, sessionId
- Implementar blacklist para logout inmediato
- Soporte para múltiples dispositivos (sessionId único por dispositivo)

## Entidad Session (para multi-device)

```typescript
// Nueva entidad para sesiones
@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn('uuid')
  idSession!: string;

  @Column({ type: 'uuid' })
  idUser!: string;

  @Column({ type: 'varchar', length: 255 })
  deviceInfo!: string;    // "Chrome on Windows"

  @Column({ type: 'varchar', length: 45 })
  ipAddress!: string;

  @Column({ type: 'varchar', length: 500 })
  refreshToken!: string;  // hashed

  @Column({ type: 'timestamp' })
  createdAt!: Date;

  @Column({ type: 'timestamp' })
  expiresAt!: Date;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;
}
```

## Endpoints de Sesión

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/auth/sessions` | Listar sesiones activas |
| DELETE | `/auth/sessions/:id` | Cerrar sesión específica |
| DELETE | `/auth/sessions` | Cerrar todas las sesiones |