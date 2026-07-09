---
description: Prepare a well-formed commit and pull request for the current changes in Wallet AI
argument-hint: [issue-or-ticket-reference] (optional, e.g. "WALLET-142")
allowed-tools: Read, Grep, Glob, Bash(git status), Bash(git diff:*), Bash(git log:*), Bash(git add:*), Bash(git commit:*), Bash(git branch:*), Bash(git push:*)
---

# Prepare Commit & Pull Request

Reference: $ARGUMENTS (optional ticket/issue ID to include in the commit/PR).

## 1. Inspect the change set

- Run `git status` and `git diff` (staged + unstaged) to understand exactly
  what changed.
- Run `git log --oneline -5` to see recent commit style and confirm you're on
  a feature branch, not `main`/`master`. If on a protected branch, stop and
  ask before doing anything else.
- Group the changes mentally by concern (e.g. "new Budgets module",
  "fix Transaction ownership check", "test coverage for Splits") — a PR
  should ideally represent one coherent concern. If the diff clearly mixes
  unrelated concerns, flag this to the user before proceeding rather than
  bundling them silently.

## 2. Pre-flight checks (do not skip)

Run the same checklist as `.claude/commands/review.md`, focused only on the
changed files:
- Naming conventions (`.claude/rules/code-style.md`)
- API/response contract, if controllers/DTOs changed (`.claude/rules/api-conventions.md`)
- Database safety, if entities changed (`.claude/rules/database-conventions.md`)
- Security basics, if auth/financial-data code changed (`.claude/rules/security.md`)
- Matching `.spec.ts` present for new/changed services and controllers

Run `pnpm run lint` and `pnpm run test` (scoped to affected files at minimum).
If either fails, stop and fix or report — never commit failing code.

## 3. Write the commit message(s)

Use **Conventional Commits**:

```
<type>(<scope>): <short imperative summary>

<optional body — the "why", not a restatement of the diff>

<optional footer — "Refs: $ARGUMENTS" if a ticket reference was given>
```

Allowed `type` values: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`,
`perf`, `style`. `scope` is the module name when the change is scoped to one
(e.g. `feat(budgets): add monthly threshold validation`).

- One logical change per commit. If the change set mixes concerns per step 1,
  propose splitting into multiple commits via `git add -p` rather than one
  giant commit — but confirm with the user before splitting automatically.
- Never write a commit message that just restates filenames
  ("update budget.service.ts") — describe the behavior change.

Stage and commit only after showing the proposed message(s) to the user, or
if the user has already asked to proceed autonomously.

## 4. Write the pull request description

```
## Summary
[1–3 sentences: what changed and why]

## Changes
- [bullet per logical change, grouped by module if multiple]

## Testing
- [commands run: pnpm run lint / pnpm run test / pnpm run test:cov]
- [new test files added, coverage impact if notable]

## Architecture / Data Notes
- [only if relevant: new migration needed? new entity relationship?
  breaking API change?]

## Checklist
- [ ] Lint passes
- [ ] Tests pass (`pnpm run test`)
- [ ] New/changed endpoints documented (Swagger)
- [ ] No secrets or sensitive data exposed in responses/logs
- [ ] Migration added if entity schema changed (see database-conventions.md)

Refs: $ARGUMENTS
```

## 5. Push and open the PR

- Confirm the remote branch name follows the project's convention (ask if
  unclear — do not invent one silently).
- `git push -u origin <branch>` only after the user confirms the commit(s)
  look right.
- If the `github` MCP server (configured in `.claude/settings.json`) is
  available, use it to open the PR with the description from step 4 instead
  of just printing instructions. Otherwise, output the description ready to
  paste manually.

## Guardrails

- Never force-push (`git push --force` is explicitly denied in
  `.claude/settings.json`).
- Never commit directly to `main`/`master`.
- Never include `.env`, credentials, or `CLAUDE.local.md` content in a commit
  or PR description.
- If pre-flight checks (step 2) turn up a 🔴 Must Fix item, do not proceed to
  commit — report it and ask whether to fix first.