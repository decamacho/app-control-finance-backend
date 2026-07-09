# Git Workflow & Standards

## Commit Message Convention
All commits MUST follow the Conventional Commits standard. This ensures a readable history and automated changelog generation.

**Format:**
`<type>(<optional scope>): <description>`

**Allowed Types:**
* `feat`: New feature added to the application
* `fix`: Bug fix
* `docs`: Documentation changes (README, CLAUDE.md, etc.)
* `style`: Formatting, missing semi-colons, etc. (no code change)
* `refactor`: Refactoring production code (e.g., extracting a method)
* `test`: Adding or refactoring tests
* `chore`: Updating build tasks, package manager configs, etc.

**Example:**
`feat(wallets): add support for crypto wallet types`

## Pull Request Process
When drafting or reviewing a Pull Request, you must ensure the following checklist is met:

1. **Branch Naming**: `type/issue-number-short-description` (e.g., `feat/123-crypto-wallets`).
2. **Lint & Format**: Code must pass `pnpm run lint` and `pnpm run format`.
3. **Testing**: All unit tests must pass via `pnpm run test`. If adding a feature, new `.spec.ts` files must be included.
4. **Architecture Compliance**: Ensure the code respects the Layered Architecture + DDD principles defined in `CLAUDE.md` (Presentation -> Application -> Domain -> Infrastructure).
5. **No Sensitive Data**: Ensure `.env` variables or passwords are not hardcoded.