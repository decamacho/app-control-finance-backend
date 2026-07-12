---
description: Run the test suite, report coverage, and identify untested code paths
argument-hint: [module-name] (optional — defaults to the whole project)
allowed-tools: Bash(pnpm run test:cov*), Read, Grep, Glob
---

# Test Coverage — $ARGUMENTS

Scope: $ARGUMENTS (if empty, run against the full project).

1. Run `pnpm run test:cov` (or scoped with `--testPathPattern=$ARGUMENTS` if a
   module was given).
2. Compare results against the coverage threshold defined in
   `.claude/rules/testing.md`.
3. For any service/controller below threshold, identify **which branches**
   are untested (error paths, edge cases like duplicate-key `23505` handling,
   empty-result queries) rather than just restating the percentage.
4. Propose specific missing test cases in plain language before writing any
   code, so the user can confirm scope.
5. If asked to close the gap, delegate test authorship to the `test-engineer`
   subagent or the `test-generator` skill to keep style consistent with
   existing `.spec.ts` files.

## Output Format

```
## Coverage Report — $ARGUMENTS

| File | Lines | Branches | Gap |
|------|-------|----------|-----|
| ...  | ...%  | ...%     | ... |

### Suggested test cases
- [service/method]: ...
```