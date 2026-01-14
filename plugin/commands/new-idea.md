---
description: Help prioritize next feature to implement from game design ideas and GitHub issues
allowed-tools:
  - Read
  - Glob
  - Grep
  - TodoWrite
  - AskUserQuestion
  - mcp__github__list_issues
  - mcp__github__search_issues
argument-hint: "[category] e.g., 'gameplay', 'ui', 'physics'"
---

# Feature Prioritization

Analyze game design document and GitHub issues to help prioritize the next feature to implement.

## Process

1. **Gather feature sources**

   **From game-design.md**:
   - Read `docs/game-design.md`
   - Extract "EXCLUDED" features from MVP scope
   - Note planned mechanics mentioned but not implemented
   - Identify polish opportunities

   **From GitHub issues**:
   - Use `mcp__github__list_issues` to fetch open issues
   - Filter by labels: `enhancement`, `feature-request`
   - Note issue priority and reactions

   **From maintenance guide**:
   - Read `docs/maintenance-guide.md` technical debt table
   - Note high-priority debt items

2. **Categorize ideas**

   | Category | Description |
   |----------|-------------|
   | Gameplay | Core mechanics, new puzzle types |
   | UI/UX | Visual improvements, feedback |
   | Physics | New constraints, interactions |
   | Meta | Progression, unlocks, saves |
   | Polish | Animations, sounds, effects |
   | Technical | Performance, architecture |

3. **Analyze each idea**
   For each potential feature, assess:
   - **Value**: How much does it improve the game?
   - **Effort**: Complexity based on architecture knowledge
   - **Dependencies**: What must exist first?
   - **Risk**: What could go wrong?

4. **Present prioritized list**
   Show user a ranked list with:
   - Feature name and description
   - Category
   - Value/Effort assessment
   - Dependencies (if any)
   - Source (game-design.md, GitHub issue #, etc.)

5. **Help user decide**
   Use AskUserQuestion to let user pick:
   - Which feature to implement next
   - Or request more details on specific features

6. **Transition to implementation**
   Once user picks a feature:
   - Summarize the feature requirements
   - Suggest invoking `/sm:create-feature` to begin

## Known Excluded Features (from MVP)

These are documented in game-design.md as out of scope for MVP:
- Undo functionality
- Timers/scoring
- Meta progression
- 3D rotation
- Special screw types

## Technical Debt to Consider

From maintenance-guide.md known debt:
- Win/stuck UI handlers (needs actual UI)
- System migration to getComponents pattern

## Example Output Format

```
## Feature Prioritization Report

### High Value / Low Effort
1. **Add win celebration animation** (Polish)
   - Source: Implied by game-design.md "juice" mentions
   - Value: High - improves game feel
   - Effort: Low - AnimationSystem exists

### High Value / Medium Effort
2. **Undo functionality** (Gameplay)
   - Source: game-design.md excluded feature
   - Value: High - reduces frustration
   - Effort: Medium - state snapshot needed

### GitHub Issues
3. **Issue #42: Add haptic feedback** (UI/UX)
   - Reactions: 5
   - Value: Medium
   - Effort: Low

Which feature would you like to implement?
```

## Reference Files

- Game design: `docs/game-design.md`
- Architecture: `docs/game-architecture.md`
- Technical debt: `docs/maintenance-guide.md`
