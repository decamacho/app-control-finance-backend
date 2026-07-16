---
name: 00-auth-access-control-04-security
description: Seguridad: rate limiting, headers, guards y RBAC
priority: high
parent: 00-auth-access-control
---

# Plan: Seguridad y Control de Acceso

## Objetivo

Implementar protecciones de seguridad:
- Rate limiting
- Headers de seguridad (Helmet)
- Guards de autenticación
- Control de acceso por roles (RBAC)

## Tareas

| # | Descripción | Archivo Afectado | Dep |
|---|-------------|------------------|-----|
| 01 | Configurar ThrottlerModule | `src/modules/auth/auth.module.ts` | - |
| 02 | Configurar Helmet en main.ts | `src/main.ts` | - |
| 03 | Crear RolesGuard | `src/modules/auth/guards/roles.guard.ts` | - |
| 04 | Crear decorador @Roles() | `src/modules/auth/decorators/roles.decorator.ts` | - |
| 05 | Crear ActiveUserGuard | `src/modules/auth/guards/active-user.guard.ts` | - |
| 06 | Proteger módulos existentes | `src/modules/*/controllers/*.ts` | - |
| 07 | Crear endpoint lista de sesiones | `src/modules/auth/controllers/auth.controller.ts` | - |
| 08 | Crear endpoint cerrar sesión específica | `src/modules/auth/controllers/auth.controller.ts` | - |
| 09 | Crear endpoint cerrar todas las sesiones | `src/modules/auth/controllers/auth.controller.ts` | - |

## Rate Limiting

```typescript
// Configuración
THROTTLE_TTL=60000    // 1 minuto
THROTTLE_LIMIT=100    // 100 peticiones

// Endpoints auth (más estricto)
login: 5 intentos/minuto
register: 3 intentos/minuto
```

## Helmet - Headers de Seguridad

```typescript
app.use(helmet({
  contentSecurityPolicy: true,
  crossOriginEmbedderPolicy: true,
}));
```

## RBAC - Decoradores

```typescript
// Usage
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class UsersController { ... }

// or
@Roles('ADMIN', 'USER')
```

## Guards a Crear

| Guard | Propósito |
|-------|-----------|
| JwtAuthGuard | Verifica token JWT válido |
| RolesGuard | Verifica rol del usuario |
| ActiveUserGuard | Verifica usuario activo (statusUser = 'ACTIVE') |

## Proteger Módulos Existentes

| Módulo | Archivo |
|--------|---------|
| Users | `users.controller.ts` |
| Wallets | `wallets.controller.ts` |
| Transactions | `transactions.controller.ts` |
| Categories | `categories.controller.ts` |
| Alerts | `alerts.controller.ts` |
| Budgets | `budgets.controller.ts` |
| Goals | `goals.controller.ts` |
| Splits | `splits.controller.ts` |

## Testing

- Rate limiting (429 después del límite)
- Headers de seguridad presentes
- Acceso sin token (401)
- Acceso con token válido (200)
- Acceso con rol incorrecto (403)
- Usuario inactivo (403)