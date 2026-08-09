---
name: test-generator
description: Use automatically after creating or modifying a service or controller in Wallet AI. Generates or updates the matching .spec.ts file following the project's Arrange/Act/Assert pattern and repository-mocking conventions, so new code isn't left without tests.
---

# Test Generator

Keeps every service/controller paired with a `.spec.ts` file, per
`.claude/rules/testing.md`.

## Process

1. Identify the file just created/modified and its co-located spec path
   (e.g. `services/users.service.ts` → `services/users.service.spec.ts`).
2. If the spec doesn't exist, generate it; if it exists, add tests only for
   the new/changed methods rather than rewriting the whole file.
3. For services: mock the TypeORM repository via
   `getRepositoryToken(Entity)`; cover the happy path, the `23505` conflict
   mapping (if the method persists data), and any explicit validation/business
   rule in the method.
4. For controllers: mock the service; verify routing and that `ParseUUIDPipe`
   / DTO validation are wired, not the business logic itself (that's the
   service test's job).
5. Use the Arrange/Act/Assert structure from `.claude/rules/testing.md`.

## Template (service test)

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException } from '@nestjs/common';
import { <Module>Service } from './<module>.service';
import { <Module> } from '../entities/<module>.entity';

describe('<Module>Service', () => {
  let service: <Module>Service;
  let repository: { save: jest.Mock; create: jest.Mock; findOne: jest.Mock };

  beforeEach(async () => {
    repository = { save: jest.fn(), create: jest.fn(), findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        <Module>Service,
        { provide: getRepositoryToken(<Module>), useValue: repository },
      ],
    }).compile();

    service = module.get(<Module>Service);
  });

  it('should create a <module>', async () => {
    // Arrange
    repository.create.mockReturnValue({ name<Module>: 'Test' });
    repository.save.mockResolvedValue({ id<Module>: 'uuid', name<Module>: 'Test' });

    // Act
    const result = await service.create({ name<Module>: 'Test' } as any);

    // Assert
    expect(result.name<Module>).toBe('Test');
  });

  it('should throw ConflictException on duplicate', async () => {
    // Arrange
    repository.save.mockRejectedValue({ code: '23505' });

    // Act
    const action = service.create({ name<Module>: 'Test' } as any);

    // Assert
    await expect(action).rejects.toThrow(ConflictException);
  });
});
```

After generating, run `pnpm run test -- --testPathPattern=<module>` to confirm
the new tests actually pass, not just compile.