---
description: Review current changes against Wallet AI architecture, style, and testing conventions
argument-hint: [file-or-directory] (optional — defaults to uncommitted git changes)
allowed-tools: Read, Grep, Glob, Bash(git diff:*), Bash(git status:*), Bash(git log:*)
---

# Code Review — Wallet AI

Review the following scope: $ARGUMENTS (if empty, use `git diff` against the current
uncommitted changes, and `git status` to see new untracked files).

Perform the review in this order:

1. **Architecture fit** — does the change respect the layered structure
   (`controllers/ → services/ → entities/`) described in `CLAUDE.md`? Flag any
   business logic that leaked into a controller, or DB access outside a service.
2. **Naming conventions** — check against `.claude/rules/code-style.md`
   (file suffixes, Spanish-suffixed entity fields like `idUser`, `emailUser`).
3. **API contract** — for controller/DTO changes, verify compliance with
   `.claude/rules/api-conventions.md` (response wrapper, `ParseUUIDPipe`,
   `whitelist: true` validation, Swagger decorators).
4. **Database safety** — for entity/migration changes, check
   `.claude/rules/database-conventions.md` (UUID PKs, soft deletes, no
   `synchronize: true` reliance for production changes).
5. **Security** — check `.claude/rules/security.md` (no plaintext secrets,
   passwords excluded from responses, bcrypt salt rounds, input validation).
6. **Tests** — is there a matching `.spec.ts`? Does it follow
   `.claude/rules/testing.md`?

If the change is architecturally significant (new module, changed entity
relationships, new external integration), delegate deep analysis to the
`software-architect` subagent instead of reviewing it yourself.

## Output Format

```
## Review Summary

### 🟢 Looks good
- ...

### 🟡 Suggestions
- [file:line] ...

### 🔴 Must fix before merge
- [file:line] ...

### Missing tests
- ...
```