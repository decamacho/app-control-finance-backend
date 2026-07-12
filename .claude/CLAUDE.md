# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

This is a NestJS backend application for a personal finance control system (Wallet AI). It uses PostgreSQL as the database with TypeORM for data access.

---

## Development Commands

```bash
# Install dependencies
pnpm install

# Development
pnpm run start:dev       # Run with hot reload
pnpm run start:debug     # Run with debug mode

# Production
pnpm run build           # Compile TypeScript
pnpm run start:prod      # Run compiled code

# Testing
pnpm run test            # Run all unit tests
pnpm run test:watch     # Run tests in watch mode
pnpm run test:cov       # Run tests with coverage

# Code quality
pnpm run lint           # Lint and fix
pnpm run format        # Format with Prettier
```

---

## Database Setup

Start PostgreSQL with docker-compose:
```bash
docker-compose up -d
```

The database runs on port 5433 (not the default 5432) to avoid conflicts.

**Docker Containers:**
| Container | Image | Port |
|-----------|-------|------|
| `app_control_finance_postgres` | postgres:15-alpine | 5433 → 5432 |

---

## Environment Variables

Required in `.env`:
- `PORT` - Server port (default: 3000)
- `DB_HOST` - Database host
- `DB_PORT` - Database port (default: 5433)
- `DB_USERNAME` - Database user
- `DB_PASSWORD` - Database password
- `DB_DATABASE` - Database name

---

## Architecture

### Implemented Architecture

The project follows a **Hexagonal Architecture and Clean Architecture** with **Domain-Driven Design (DDD)** and SOLID principles:

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ Controllers │  │   DTOs      │  │  ResponseInterceptor│ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│                    APPLICATION LAYER                        │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                    Services                             │ │
│  │  - Business Logic    - Validation    - Error Handling │ │
│  └─────────────────────────────────────────────────────────┘ │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│                      DOMAIN LAYER                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Entities   │  │  Interfaces │  │   Enums/Types      │  │
│  │ (TypeORM)   │  │  (Contracts)│  │   (Business Rules) │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│                  INFRASTRUCTURE LAYER                        │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  TypeORM Repository    │    PostgreSQL Database         │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Architectural Patterns Used

| Pattern | Implementation | Location |
|---------|----------------|----------|
| **Repository** | TypeORM Repositories | `entities/*.entity.ts` |
| **DTO (Data Transfer Object)** | class-validator DTOs | `dto/*.dto.ts` |
| **Factory** | Entity factories in services | `services/*.service.ts` |
| **Dependency Injection** | NestJS @Injectable | All services |
| **Interceptor** | Response wrapper | `core/interceptors/` |
| **Filter** | Global exception handler | `core/filters/` |
| **Pipe** | ValidationPipe (whitelist) | `main.ts` |

### Module Structure

Each feature module follows a consistent structure under `src/modules/<module-name>/`:

```
modules/
├── <module>/
│   ├── controllers/     # REST endpoints
│   │   └── <module>.controller.ts
│   ├── services/        # Business logic
│   │   └── <module>.service.ts
│   ├── entities/        # TypeORM entities
│   │   └── <module>.entity.ts
│   ├── dto/             # Data transfer objects
│   │   ├── create-<module>.dto.ts
│   │   └── update-<module>.dto.ts
│   ├── interfaces/      # Contracts and types
│   ├── types/           # Enums and constants
│   └── <module>.module.ts
```

### Core Modules

| Module | Description | Key Features |
|--------|-------------|---------------|
| **Users** | User management with roles | bcrypt hashing, roles (ADMIN, USER), Google OAuth |
| **Wallets** | Financial wallet accounts | Tipos de wallet, asociación usuario-wallet |
| **Transactions** | Financial transactions | Tipos de transacción, categorías, detalles |
| **Categories** | Transaction categories | Categorías personalizadas por usuario |
| **Alerts** | Financial alerts | Tipos de alertas, notificaciones |
| **Budgets** | Budget management | Control de gastos por categoría |
| **Goals** | Savings goals | Metas de ahorro con seguimiento |
| **Splits** | Transaction splitting | División entre múltiples usuarios |

### Request Flow

```
HTTP Request
     │
     ▼
┌──────────────────────────────────────────┐
│         NestJS Bootstrap (main.ts)       │
│  ┌────────────────────────────────────┐  │
│  │  ValidationPipe (whitelist: true) │  │
│  │  - Transform payloads              │  │
│  │  - Validate DTOs                  │  │
│  └────────────────────────────────────┘  │
└──────────────────┬───────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────┐
│              Controller                  │
│  - ParseUUIDPipe for UUID validation    │
│  - Route matching                       │
│  - Delegates to Service                 │
└──────────────────┬───────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────┐
│               Service                     │
│  - Business logic                        │
│  - Entity manipulation                  │
│  - Database error handling (23505)     │
└──────────────────┬───────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────┐
│            TypeORM Repository             │
│  - Query execution                       │
│  - Entity mapping                       │
└──────────────────┬───────────────────────┘
                   │
                   ▼
              PostgreSQL
                   │
                   ▼
┌──────────────────────────────────────────┐
│        ResponseInterceptor               │
│  - Wraps response { success, data }     │
└──────────────────┬───────────────────────┘
                   │
                   ▼
              JSON Response
```

### Entity Relationships

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

### Key Architectural Decisions

1. **UUID as Primary Keys**: All entities use `@PrimaryGeneratedColumn('uuid')` for distributed ID generation
2. **Soft Deletes**: Users are marked as `INACTIVE` instead of hard delete
3. **Password Security**: bcrypt with salt rounds of 10
4. **Validation Strategy**: `whitelist: true` - strips unknown properties
5. **Error Handling**: Custom PostgreSQL error codes mapped to HTTP exceptions
6. **Response Wrapping**: All responses wrapped in consistent format
7. **Eager Loading**: Role relations loaded by default in User entity

---

## API Response Format

The application uses a global response interceptor that wraps all responses:

```typescript
{
  success: boolean,
  statusCode: number,
  message: string,
  data: T
}
```

### Error Handling

Global exception filter returns consistent error format:

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

Validation uses `class-validator` with `whitelist: true` - unknown properties are stripped.

---

## Database

- TypeORM with PostgreSQL
- `synchronize: true` is enabled (development only)
- Entities are in `src/modules/*/entities/`
- Custom Postgres error handling in services (error code 23505 for unique violations)

---

## Naming Conventions

| Resource | Pattern | Example |
|----------|---------|---------|
| Entities | `<name>.entity.ts` | `user.entity.ts` |
| DTOs | `create-*.dto.ts`, `update-*.dto.ts` | `create-user.dto.ts` |
| Services | `<name>.service.ts` | `users.service.ts` |
| Controllers | `<name>.controller.ts` | `users.controller.ts` |
| Modules | `<name>.module.ts` | `users.module.ts` |

### Entity Field Conventions

- Field names with suffix: `idUser`, `emailUser`, `passwordUser`
- UUID primary keys: `@PrimaryGeneratedColumn('uuid')`
- Use `ParseUUIDPipe` for validating UUID parameters in controllers

---

## Testing

Tests follow the NestJS convention with `.spec.ts` suffix. Test files are co-located with the files they test.

Example run single test:
```bash
pnpm run test -- --testPathPattern=users.service.spec.ts
```

---

## Development Workflow

### Adding a New Module

```
1. CREATE entity in src/modules/<module>/entities/<module>.entity.ts
2. CREATE DTOs in src/modules/<module>/dto/
3. CREATE service in src/modules/<module>/services/<module>.service.ts
4. CREATE controller in src/modules/<module>/controllers/<module>.controller.ts
5. CREATE module in src/modules/<module>/<module>.module.ts
6. REGISTER module in src/app.module.ts
7. CREATE tests in src/modules/<module>/services/<module>.service.spec.ts
8. UPDATE .claude/CLAUDE.md if there are significant changes
```

### Code Style Guidelines

- Use TypeScript strict mode
- Follow ESLint and Prettier configurations
- Use async/await for all asynchronous operations
- Handle database errors with proper exception types
- Return cleaned data (exclude sensitive fields like passwords)

---

## Troubleshooting

### Docker Issues

If Docker is not running:
1. Start Docker Desktop
2. Wait for "Docker is running" status
3. Run `docker ps` to verify containers are up

### Database Connection Issues

1. Verify PostgreSQL container is running: `docker ps`
2. Check `.env` credentials match docker-compose configuration
3. Ensure port 5433 is not in use by another service

### Test Failures

1. Check database is running
2. Verify `.env` configuration
3. Run with verbose output: `pnpm run test -- --verbose`