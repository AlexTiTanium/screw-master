# Screw Master Claude Code Plugin

A development automation plugin for the Screw Master game project. Provides commands, agents, and skills to streamline common development workflows.

## Installation

This plugin is project-local and auto-loads when you run Claude Code in the Screw Master directory:

```bash
cd screw-master
claude
# Plugin auto-loads from .claude-plugin/
```

### Verify Installation

After starting Claude Code, run `/help` to see the available commands. You should see:
- `/sm:fix-bug`
- `/sm:create-feature`
- `/sm:create-level`
- `/sm:maintenance`
- `/sm:new-idea`

## Commands

| Command | Description |
|---------|-------------|
| `/sm:fix-bug` | Guide through test-first bug fixing workflow |
| `/sm:create-feature` | 9-phase TDD feature development workflow |
| `/sm:create-level` | Generate level JSON from natural language description |
| `/sm:maintenance` | Run 18-section maintenance checklist |
| `/sm:new-idea` | Prioritize next feature from game design + GitHub issues |

### Usage Examples

```
/sm:fix-bug bug-reports/2024-01-15-crash/
/sm:create-feature Add haptic feedback when screws are removed
/sm:create-level A simple puzzle with 2 red screws and 1 blue screw on a walnut board
/sm:maintenance all
/sm:new-idea gameplay
```

## Agents

Agents can be invoked via the Task tool or by asking Claude to use them:

| Agent | Purpose |
|-------|---------|
| `code-reviewer` | Review code against ECS patterns, event-driven architecture |
| `test-generator` | Generate unit and E2E tests following project patterns |
| `level-validator` | Validate level JSON against schema and design rules |
| `architecture-checker` | Verify system registration order and event flow |

### Usage Examples

- "Can you use the code-reviewer to check my new system?"
- "Generate tests for the TrayManagementSystem"
- "Validate the level in region-test.json"
- "Check if the architecture docs are in sync"

## Skills

Skills auto-activate based on context:

| Skill | Auto-activates when |
|-------|---------------------|
| `ecs-patterns` | Creating systems, components, or entities |
| `game-events` | Working with GameEventBus or event flow |
| `level-design` | Creating or modifying level files |

## Project Structure

```
.claude-plugin/
├── plugin.json         # Plugin manifest
├── commands/           # Slash commands
│   ├── fix-bug.md
│   ├── create-feature.md
│   ├── create-level.md
│   ├── maintenance.md
│   └── new-idea.md
├── agents/             # Specialized agents
│   ├── code-reviewer.md
│   ├── test-generator.md
│   ├── level-validator.md
│   └── architecture-checker.md
└── skills/             # Auto-activating skills
    ├── ecs-patterns/
    ├── game-events/
    └── level-design/
```

## Development

### Modifying the Plugin

Edit files directly in `.claude-plugin/`. Changes take effect in the next Claude Code session.

### Adding New Commands

1. Create a new `.md` file in `commands/`
2. Add YAML frontmatter with `name`, `description`, `allowed-tools`
3. Write instructions in the markdown body

### Adding New Agents

1. Create a new `.md` file in `agents/`
2. Add frontmatter with `name`, `description`, `model`, `color`, `tools`
3. Include `<example>` blocks in description for triggering
4. Write system prompt in markdown body

### Adding New Skills

1. Create a directory in `skills/`
2. Add `SKILL.md` with frontmatter (`name`, `description`)
3. Write skill content using imperative form

## Related Documentation

- [Game Design](../docs/game-design.md)
- [Game Architecture](../docs/game-architecture.md)
- [Feature Development Guide](../docs/feature-development-guide.md)
- [Bug Fixing Workflow](../docs/bug-fixing-workflow.md)
- [Maintenance Guide](../docs/maintenance-guide.md)
- [Level Design Guide](../docs/level-design.md)
- [Level Format Spec](../docs/level-format.md)
