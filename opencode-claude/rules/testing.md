# Testing Rules — Wallet AI

## Conventions

- Tests use the NestJS convention with the `.spec.ts` suffix and are
  **co-located** with the file they test (e.g.
  `src/modules/users/services/users.service.spec.ts`).
- Run a single test file with:
```bash
  pnpm run test -- --testPathPattern=users.service.spec.ts
```
- Run the full suite with `pnpm run test`; use `pnpm run test:watch` during
  active development and `pnpm run test:cov` before opening a PR.

## Structure — Arrange / Act / Assert

Every test body should read in three clear parts, even without explicit
comments:

```typescript
it('should throw ConflictException when email already exists', async () => {
  // Arrange
  mockRepository.save.mockRejectedValue({ code: '23505' });

  // Act
  const action = () => service.create(createUserDto);

  // Assert
  await expect(action).rejects.toThrow(ConflictException);
});
```

## What Must Be Tested

For every **service**:
- The happy path for each public method.
- Postgres error code `23505` (unique constraint) mapped to the correct HTTP
  exception.
- Any explicit business rule (e.g. budget exceeding a category limit, split
  amounts summing to the transaction total).

For every **controller**, prefer testing through the service mock rather than
duplicating service-level assertions — controller tests should verify routing,
DTO validation wiring, and `ParseUUIDPipe` usage, not business logic.

## Mocking

- Mock the TypeORM `Repository<T>` at the provider level using Jest
  (`getRepositoryToken(Entity)`), never hit a real database in unit tests.
- Do not mock what you don't own beyond the immediate dependency boundary —
  mock the repository, not TypeORM internals.

## Coverage

- Minimum coverage threshold: **80%** for lines and branches on
  `services/` and `controllers/`. New modules must meet this before merge.
- A high percentage with untested error branches does not satisfy this rule —
  coverage tooling measures lines executed, not correctness; reviewers should
  still check that failure paths (validation errors, not-found, conflict) are
  exercised.

## E2E Tests

- End-to-end tests (if present) live under `test/` at the project root, use the
  `.e2e-spec.ts` suffix, and run against a Dockerized test database — never
  against the shared local dev database on port 5433 unless explicitly isolated.