---
name: 00-auth-access-control-03-oauth
description: Implementación de Google OAuth 2.0
priority: high
parent: 00-auth-access-control
---

# Plan: Google OAuth 2.0

## Objetivo

Implementar autenticación con Google:
- Integración con Google OAuth 2.0
- Crear usuario si no existe
- Login automático si existe
- Actualizar entidad User para almacenar tokens

## Tareas

| # | Descripción | Archivo Afectado | Dep |
|---|-------------|------------------|-----|
| 01 | Definir config Google OAuth | `src/modules/auth/types/google-oauth.config.ts` | - |
| 02 | Crear DTO google-callback.dto | `src/modules/auth/dto/google-callback.dto.ts` | - |
| 03 | Implementar GoogleOAuthService | `src/modules/auth/services/google-oauth.service.ts` | - |
| 04 | Implementar GoogleOAuthStrategy | `src/modules/auth/strategies/google-oauth.strategy.ts` | 03 |
| 05 | Agregar endpoints Google en AuthController | `src/modules/auth/controllers/auth.controller.ts` | 03, 04 |
| 06 | Actualizar entidad User (campos adicionales) | `src/modules/users/entities/user.entity.ts` | - |

## Entidad User - Campos a Agregar

```typescript
// Para OAuth
@Column({ type: 'varchar', length: 500, nullable: true })
googleRefreshToken!: string | null;

@Column({ type: 'timestamp', nullable: true })
googleTokenExpiry!: Date | null;
```

## Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/auth/google` | Redireccionar a Google |
| GET | `/auth/google/callback` | Callback de Google |

## Flujo

```
1. Usuario -> GET /auth/google
2. Redirección a Google OAuth
3. Usuario autoriza
4. Google -> /auth/google/callback?code=...
5. Intercambiar code por tokens
6. Crear/actualizar usuario
7. Retornar JWT
```

## Casos a Manejar

- Usuario nuevo → crear en BD + retornar token
- Usuario existente con Google → login + actualizar tokens
- Usuario existente sin Google → vincular cuenta

## Testing

- Redirect a Google (302)
- Callback con código válido (200 + token)
- Callback con código inválido (401)
- Usuario nuevo creado
- Usuario existente logueado