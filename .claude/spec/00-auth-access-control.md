---
name: 00-auth-access-control
description: Plan maestro para el sistema de autenticación y control de acceso
priority: high
---

# Plan: Sistema de Control de Acceso y Autenticación

## Objetivo

Implementar un sistema completo de autenticación y control de acceso para Wallet AI con:
- Autenticación tradicional (email/password)
- Autenticación con Google OAuth 2.0
- JWT para gestión de sesiones seguras
- Rate limiting y headers de seguridad
- Control de acceso basado en roles (RBAC)

## Alcance

| Módulo | Descripción |
|--------|-------------|
| JWT | Generación, validación y refresh tokens |
| Traditional Auth | Login/registro con email + password + verificación de email |
| Google OAuth | Integración con Google OAuth 2.0 |
| Security | Guards, decorators, rate limiting |
| Multi-device | Soporte para múltiples sesiones concurrentes |

## Requisitos Adicionales

### 1. Usuarios Locales con Verificación de Email
- Token de verificación enviado por email
- Expiración del token (24 horas)
- Re-envío de token
- Endpoint de verificación `/auth/verify-email/:token`

### 2. Tokens Cortos con Refresh
- Access token: 15 minutos
- Refresh token: 7 días
- Renovación mediante endpoint `/auth/refresh`
- Invalidación de refresh tokens

### 3. Múltiples Dispositivos
- Seguimiento de sesiones por dispositivo
- Lista de sesiones activas por usuario
- Cierre de sesión individual por dispositivo
- Cierre de todas las sesiones
- Información de dispositivo (IP, browser, OS)

## Sub-Planes

| Archivo | Tema | Prioridad |
|---------|------|-----------|
| `00-auth-access-control-01-jwt.md` | JWT Tokens | high |
| `00-auth-access-control-02-traditional.md` | Auth Tradicional | high |
| `00-auth-access-control-03-oauth.md` | Google OAuth | high |
| `00-auth-access-control-04-security.md` | Seguridad y Guards | high |

## Dependencias Comunes

```json
{
  "@nestjs/passport": "^11.0.0",
  "@nestjs/jwt": "^11.0.0",
  "@nestjs/throttler": "^6.0.0",
  "passport": "^0.7.0",
  "passport-jwt": "^4.0.1",
  "passport-local": "^1.0.0",
  "passport-google-oauth20": "^2.0.0",
  "helmet": "^8.0.0"
}
```

## Variables de Entorno Requeridas

```env
# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# Rate Limiting
THROTTLE_TTL=60000
THROTTLE_LIMIT=100
```

## Cronograma Sugerido

- **Semana 1**: JWT + Auth tradicional
- **Semana 2**: Google OAuth + Seguridad
- **Semana 3**: Integración + Testing

## Notas

- La entidad User existente ya tiene `passwordUser`, `googleIdUser`, `lastLoginUser`, `statusUser`
- Se reutiliza bcrypt existente en UsersService
- Roles existentes (ADMIN, USER) se usan para RBAC