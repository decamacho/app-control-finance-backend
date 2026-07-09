# Claude Configuration

This folder contains all Claude Code-specific configurations, agents, commands, rules, and skills for the Wallet AI project.

## Folder Structure

```
.claude/
├── README.md                    # This file - Overview and usage guide
├── CLAUDE.md                    # Main guide for Claude Code
├── settings.json               # Claude permissions and settings
├── agents/                     # Custom agent definitions
├── commands/                   # Custom slash commands
├── rules/                      # Coding rules and conventions
└── skills/                     # Custom skills for Claude
```

---

## 📁 Folder Details

### agents/

**Purpose**: Custom AI agent definitions for specialized tasks.

**What it contains**:
- `software-architect.md` - Architecture and system design specialist
- `test-engineer.md` - Test creation and coverage specialist
- `database-specialist.md` - Database design and queries specialist
- `security-auditor.md` - Security analysis specialist
- `code-reviewer.md` - Code review specialist
- `financial-logic-auditor.md` - Financial logic specialist
- `performance-engineer.md` - Performance optimization specialist
- `documentation-writer.md` - Documentation specialist
- `README.md` - Agents documentation

**How to use**:
```typescript
Agent({
  subagent_type: 'software-architect',
  prompt: 'Analiza la arquitectura del módulo X',
  description: 'Analyze X architecture'
})
```

**Why it's here**: To provide specialized AI agents that understand the project's domain, patterns, and conventions for different types of analysis and development tasks.

---

### commands/

**Purpose**: Custom slash commands that extend Claude's capabilities.

**What it contains**:
- `generate-module.md` - Scaffold a new NestJS module
- `review-local-changes.md` - Review local git changes
- `test-coverage.md` - Analyze test coverage
- `prepare-pr.md` - Prepare a pull request

**How to use**:
```
/generate-module notification
/review-local-changes
/test-coverage
/prepare-pr
```

**Why it's here**: To provide reusable command templates for common development workflows that can be invoked with `/` slash commands.

---

### rules/

**Purpose**: Coding rules, conventions, and guidelines for the project.

**What it contains**:
- `code.md` - Code style rules (TypeScript, naming conventions)
- `api-conventions.md` - REST API conventions
- `db-conventions.md` - Database conventions (TypeORM)
- `testing.md` - Testing guidelines
- `security.md` - Security guidelines
- `git-workflow.md` - Git workflow conventions

**How to use**:
These rules are automatically loaded by Claude when working on the project. They provide context for code generation and review.

**Why it's here**: To enforce consistent code quality, patterns, and conventions across all contributors and AI agents.

---

### skills/

**Purpose**: Custom skills that extend Claude's capabilities for specific tasks.

**What it contains**:
- `test-generator/` - Skill for generating unit tests
- `api-documentation/` - Skill for generating API documentation

**How to use**:
Skills are invoked through the `/skill-name` command or automatically based on context.

**Why it's here**: To provide specialized automation for repetitive tasks like test generation and documentation.

---

### CLAUDE.md

**Purpose**: Main guide for Claude Code with project overview, architecture, and development guidelines.

**What it contains**:
- Project overview
- Development commands
- Database setup
- Environment variables
- Architecture (Hexagonal + Clean Architecture + DDD)
- API response format
- Naming conventions
- Testing guidelines
- Development workflow

**Why it's here**: This is the primary reference document that Claude uses to understand the project structure and conventions.

---

### settings.json

**Purpose**: Claude permissions and configuration.

**What it contains**:
- Allowed tools and commands
- Permission settings
- Feature flags

**Why it's here**: To configure what Claude can and cannot do in the project, ensuring proper security and workflow boundaries.

---

## Usage Summary

| Folder | Purpose | How to Invoke |
|--------|---------|---------------|
| `agents/` | Specialized AI agents | `Agent` tool with `subagent_type` |
| `commands/` | Slash commands | `/command-name` |
| `rules/` | Coding guidelines | Auto-loaded |
| `skills/` | Task automation | `/skill-name` or auto-detect |
| `CLAUDE.md` | Main reference | Auto-loaded |
| `settings.json` | Permissions | Auto-loaded |

---

## Adding New Components

### Adding a New Agent
1. Create `agents/<agent-name>.md`
2. Add frontmatter with name, description, model, tools
3. Add system prompt with role and guidelines

### Adding a New Command
1. Create `commands/<command-name>.md`
2. Add frontmatter with description, argument-hint, allowed-tools
3. Add command instructions

### Adding a New Rule
1. Create `rules/<rule-name>.md`
2. Add detailed guidelines for that aspect

### Adding a New Skill
1. Create `skills/<skill-name>/SKILL.md`
2. Follow the skill format with frontmatter and instructions