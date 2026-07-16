---
name: 00-auth-access-control-02-traditional
description: Implementación de autenticación tradicional con email/password
priority: high
parent: 00-auth-access-control
---

# Plan: Autenticación Tradicional

## Objetivo

Implementar autenticación con email y contraseña:
- Registro de usuarios
- Login con credenciales
- Validación de contraseña (bcrypt existente)
- Cambio de contraseña

## Tareas

| # | Descripción | Archivo Afectado | Dep |
|---|-------------|------------------|-----|
| 01 | Crear DTO login-auth.dto | `src/modules/auth/dto/login-auth.dto.ts` | - |
| 02 | Crear DTO register-auth.dto | `src/modules/auth/dto/register-auth.dto.ts` | - |
| 03 | Crear DTO change-password.dto | `src/modules/auth/dto/change-password.dto.ts` | - |
| 04 | Crear DTO verify-email.dto | `src/modules/auth/dto/verify-email.dto.ts` | - |
| 05 | Crear DTO resend-verify.dto | `src/modules/auth/dto/resend-verify.dto.ts` | - |
| 06 | Implementar AuthService | `src/modules/auth/services/auth.service.ts` | - |
| 07 | Implementar LocalStrategy | `src/modules/auth/strategies/local.strategy.ts` | 06 |
| 08 | Implementar EmailVerificationService | `src/modules/auth/services/email-verification.service.ts` | - |
| 09 | Crear AuthController | `src/modules/auth/controllers/auth.controller.ts` | 06, 07, 08 |

## Verificación de Email

### Flujo
1. Usuario se registra → statusUser = 'PENDING_VERIFY'
2. Se genera token de verificación (uuid + timestamp hasheado)
3. Se envía email con link de verificación
4. Usuario hace click en link → `/auth/verify-email/:token`
5. Si token válido → statusUser = 'ACTIVE'

### DTOs

### verify-email.dto.ts
```typescript
@IsNotEmpty()
@IsString()
token!: string;
```

### resend-verify.dto.ts
```typescript
@IsEmail()
emailUser!: string;
```

### Endpoints de Verificación

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/auth/resend-verify` | Re-enviar token de verificación |
| GET | `/auth/verify-email/:token` | Verificar email |

## Estado de Usuario

| Status | Descripción |
|--------|-------------|
| PENDING_VERIFY | Esperando verificación de email |
| ACTIVE | Verificado y activo |
| INACTIVE | Inactivo (soft delete) |
| BLOCKED | Bloqueado por seguridad |

## DTOs a Crear

### login-auth.dto.ts
```typescript
@IsEmail()
@IsNotEmpty()
emailUser!: string;

@IsNotEmpty()
@IsString()
passwordUser!: string;
```

### register-auth.dto.ts
```typescript
@IsNotEmpty()
@IsString()
nameUser!: string;

@IsEmail()
emailUser!: string;

@IsNotEmpty()
@Length(8, 64)
@Matches(...)
passwordUser!: string;
```

### change-password.dto.ts
```typescript
@IsNotEmpty()
@IsString()
currentPassword!: string;

@IsNotEmpty()
@Length(8, 64)
newPassword!: string;
```

## Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/auth/register` | Registro de usuario |
| POST | `/auth/login` | Login tradicional |
| POST | `/auth/change-password` | Cambio de contraseña |
| POST | `/auth/logout` | Cerrar sesión |

## Testing

- Registro exitoso (201)
- Login exitoso (200 + token)
- Login fallido (401)
- Contraseña incorrecta (401)
- Cambio de contraseña exitoso