# Security Rules — Wallet AI

## Secrets

- Never commit `.env`, `.env.*`, credentials, API keys, or tokens. These are
  git-ignored and also explicitly denied for `Read` in `.claude/settings.json`.
- Never print the *value* of an environment variable in a response — confirming
  a variable is **set** is fine; echoing its contents is not.

## Authentication

- Passwords are hashed with **bcrypt**, salt rounds **10**. Never lower this
  value, never store or log plaintext passwords, and never include
  `passwordUser` (or any credential field) in a service's return value or in
  the wrapped API response — strip it before returning.
- Google OAuth is supported alongside local auth for the `Users` module —
  treat OAuth tokens with the same "never log, never return in full" rule as
  passwords.

## Input Validation

- Global `ValidationPipe` uses `whitelist: true` — this is the primary
  defense against mass-assignment; do not bypass it by manually merging
  `req.body` into an entity anywhere.
- Every DTO field needs an explicit `class-validator` decorator matching its
  actual constraints (e.g. `@IsEmail()`, `@MinLength()`, `@IsUUID()`) — a
  missing decorator is a validation gap, not a stylistic omission.

## Data Exposure

- Responses must exclude sensitive fields (passwords, internal tokens,
  possibly internal-only flags). Prefer explicit response DTOs or
  `class-transformer`'s `@Exclude()` over hoping a service "remembers" to strip
  fields.
- Financial data (`Transaction`, `Wallet`, `Budget`, `Goal`) must always be
  scoped to the authenticated user — every query for these entities needs an
  ownership check (`idUser` filter or equivalent), never trust a client-supplied
  user ID alone.

## SQL Injection

- All database access goes through TypeORM's repository/query builder with
  parameterized queries. Never interpolate user input into raw SQL strings.

## Dependencies

- Before adding a new npm package, briefly check it's actively maintained and
  has no known critical CVEs for the version being installed. Flag this in the
  summary when introducing a new dependency.

## When In Doubt

If a change touches authentication, authorization, password handling, or the
boundary of what data a user can access, route it through the
`security-auditor` subagent before considering it done.