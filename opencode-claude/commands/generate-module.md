---
description: Scaffold a new NestJS module following Wallet AI's layered architecture
argument-hint: <module-name> (singular, kebab-case, e.g. "notification")
allowed-tools: Read, Write, Edit, Glob, Grep
---

# New Module Scaffold — $ARGUMENTS

Create a complete new module named `$ARGUMENTS` under `src/modules/$ARGUMENTS/`,
following the 8-step workflow in `CLAUDE.md → Adding a New Module`. For file
templates and exact conventions, use the `module-generator` skill.

Steps to execute:

1. `entities/$ARGUMENTS.entity.ts` — UUID primary key
   (`@PrimaryGeneratedColumn('uuid')`), Spanish-suffixed fields where the module
   has user-facing data (e.g. `nameCategory`), relations declared explicitly
   (no implicit eager loading unless justified, per
   `.claude/rules/database-conventions.md`).
2. `dto/create-$ARGUMENTS.dto.ts` and `dto/update-$ARGUMENTS.dto.ts` — using
   `class-validator` decorators; `update` DTO extends `PartialType(Create...)`.
3. `services/$ARGUMENTS.service.ts` — injects the TypeORM repository, implements
   CRUD, maps Postgres error `23505` to `ConflictException`.
4. `controllers/$ARGUMENTS.controller.ts` — REST endpoints with `ParseUUIDPipe`
   on `:id` params, Swagger decorators (`@ApiTags`, `@ApiOperation`,
   `@ApiResponse`).
5. `$ARGUMENTS.module.ts` — wires controller, service, and
   `TypeOrmModule.forFeature([...])`.
6. Register the new module in `src/app.module.ts`.
7. `services/$ARGUMENTS.service.spec.ts` — unit tests with a mocked repository,
   following `.claude/rules/testing.md`.
8. If this introduces a new entity relationship, update the entity-relationship
   diagram note in `CLAUDE.md`.

After scaffolding, run `pnpm run lint` and `pnpm run test -- --testPathPattern=$ARGUMENTS`
to confirm everything compiles and passes before reporting completion.