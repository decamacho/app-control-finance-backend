---
name: api-documentation
description: Use automatically whenever a controller is created or modified in Wallet AI. Ensures Swagger/OpenAPI decorators (@ApiTags, @ApiOperation, @ApiResponse, @ApiProperty on DTOs) are present and accurate, so the generated API docs stay in sync with the actual response contract.
---

# API Documentation

Keeps Swagger documentation accurate whenever controllers or DTOs change.

## Checklist for Controllers

- `@ApiTags('<resource-plural>')` on the controller class.
- `@ApiOperation({ summary: '...' })` on every route handler, written as a
  short imperative phrase ("Create a wallet", not "This endpoint creates...").
- `@ApiResponse({ status, description })` for at least the success case and
  the most likely failure case (404, 409, 400) per endpoint.
- Response shape documented reflects the actual `ResponseInterceptor` wrapper
  (`{ success, statusCode, message, data }`), not just the raw entity/DTO.

## Checklist for DTOs

- Every field has `@ApiProperty()` (or `@ApiPropertyOptional()` for optional
  fields in update DTOs) with a `description` and, where useful, an `example`.
- Keep descriptions factual and short — mirror the `class-validator` constraint
  in plain language (e.g. "Email address, must be unique").

## What Not To Do

- Don't invent example values that look like real user data (real emails,
  real names) — use clearly synthetic placeholders (`user@example.com`).
- Don't duplicate the same `@ApiResponse` block across every method if a
  global response schema already covers it — only document what's specific
  to that endpoint.

After documenting, mention to the user that Swagger UI (`/api` or the
project's configured path) should be checked visually if the change is
significant.