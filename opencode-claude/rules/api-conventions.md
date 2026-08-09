# API Conventions — Wallet AI

## Architecture

**Hexagonal / Clean Architecture** with Domain-Driven Design and SOLID
principles:

```
PRESENTATION LAYER     → Controllers, DTOs, ResponseInterceptor
APPLICATION LAYER      → Services (business logic)
DOMAIN LAYER           → Entities, Interfaces, Enums/Types
INFRASTRUCTURE LAYER   → TypeORM Repository, PostgreSQL
```

## Request Flow

```
HTTP Request
   → ValidationPipe (whitelist: true, transform: true)
   → Controller (ParseUUIDPipe for UUID params, delegates to Service)
   → Service (business logic, entity manipulation, DB error handling)
   → TypeORM Repository
   → PostgreSQL
   → ResponseInterceptor (wraps { success, data })
   → JSON Response
```

## Response Format

Every successful response is wrapped by the global `ResponseInterceptor`:

```typescript
{
  success: boolean,
  statusCode: number,
  message: string,
  data: T
}
```

## Error Format

The global exception filter returns a consistent shape — never let a raw
NestJS or TypeORM error reach the client:

```typescript
{
  success: false,
  statusCode: number,
  error: string,
  message: string,
  timestamp: string,
  path: string
}
```

## Validation

- `ValidationPipe` is configured globally in `main.ts` with `whitelist: true`
  (unknown properties in the request body are silently stripped, not rejected —
  do not change this to `forbidNonWhitelisted` without discussion, it's a
  deliberate project choice).
- Every DTO field must have an explicit `class-validator` decorator; no
  "trust the frontend" fields.

## Endpoint Design

- Resource-oriented, plural nouns: `/users`, `/wallets`, `/transactions`.
- Standard REST verbs: `GET`, `POST`, `PATCH` (not `PUT`, since DTOs are
  partial-update friendly via `PartialType`), `DELETE`.
- Path parameters that reference an entity by ID always use `ParseUUIDPipe`.
- Document every endpoint with Swagger decorators
  (`@ApiTags`, `@ApiOperation`, `@ApiResponse`) — see the `api-documentation`
  skill, which is auto-invoked on controller changes.

## Entity Relationships (reference)

```
User (1) ──────< (N) Role
User (1) ──────< (N) WalletUser >─────< (1) Wallet
User (1) ──────< (N) Category
User (1) ──────< (N) Transaction
Wallet (1) ───< (N) Transaction
Transaction (1) ──< (N) TransactionDetail
Transaction (1) ──< (1) TransactionType
Transaction (1) ──< (1) Category
Transaction (M) ─< (N) Split >─────< (1) User
Budget (1) ──────< (1) Category
Goal (1) ───────< (1) Wallet
Alert (1) ──────< (1) User
```

Consult the `software-architect` subagent before changing any of these
relationships — they ripple through DTOs, services, and migrations.