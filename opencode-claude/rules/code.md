# Code Style Rules — Wallet AI

Applies to all TypeScript code in `src/` and `test/`.

## Language & Tooling

- **TypeScript strict mode** is enabled — never introduce `any` without an
  explicit comment justifying it. Prefer `unknown` + narrowing over `any`.
- Follow the project's **ESLint** and **Prettier** configuration as-is; run
  `pnpm run lint` and `pnpm run format` before considering a change complete.
  Do not hand-format code that conflicts with Prettier's output.
- Use **async/await** for all asynchronous operations — no raw `.then()` chains
  in application code.

## File Naming

| Resource | Pattern | Example |
|----------|---------|---------|
| Entities | `<name>.entity.ts` | `user.entity.ts` |
| DTOs (create) | `create-<name>.dto.ts` | `create-user.dto.ts` |
| DTOs (update) | `update-<name>.dto.ts` | `update-user.dto.ts` |
| Services | `<name>.service.ts` | `users.service.ts` |
| Controllers | `<name>.controller.ts` | `users.controller.ts` |
| Modules | `<name>.module.ts` | `users.module.ts` |
| Tests | `<name>.spec.ts`, co-located with the file under test | `users.service.spec.ts` |

## Entity Field Conventions

- Field names use **English structure with suffixes**
  already established in the codebase: `idUser`, `emailUser`, `passwordUser`,
  `nameCategory`. Match this pattern for new fields on existing entities —
  do not silently switch a module to a different naming style.
- UUID primary keys: always `@PrimaryGeneratedColumn('uuid')`, never
  auto-increment integers.
- Use `ParseUUIDPipe` on every controller route parameter that identifies an
  entity by UUID.

## Class & Module Structure

- One class per file. Services must not import from `controllers/`; controllers
  must not import TypeORM repositories directly — always go through a service.
- Keep DTOs free of business logic — validation only (`class-validator`),
  transformation only via `@Transform` / `class-transformer` where justified.
- Never return raw entity instances containing sensitive fields
  (`passwordUser`, tokens) from a service — strip them before returning, or use
  a response DTO / `class-transformer` `@Exclude()`.

## Imports

- Group imports: (1) Node/external packages, (2) NestJS/framework, (3) internal
  absolute imports, (4) relative imports — with a blank line between groups.
- No unused imports (enforced by lint, but check manually when writing).

## Comments

- Prefer self-explanatory code over comments. When a comment is needed, explain
  **why**, not **what** — the "what" should be obvious from well-named
  functions and variables.