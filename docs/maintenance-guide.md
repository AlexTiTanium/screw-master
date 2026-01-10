# Maintenance Guide

Execute this guide periodically after major features to maintain code quality.

## 1. Code Consistency Check

- [ ] Find and address empty functions/stubs (`TODO`, `FIXME` markers)
- [ ] Check for code duplication in factories, systems, and utilities
- [ ] Verify naming conventions via `npm run lint`
- [ ] Remove unused imports/variables via `npm run typecheck`
- [ ] Remove dead code paths
- [ ] Review `eslint-disable` comments - ensure they're still necessary

## 2. API Improvement Analysis

- [ ] Review public interfaces in `src/shared/types/` for completeness
- [ ] Verify naming follows conventions:
  - Components: `*Component`
  - Systems: `*System`
  - Entities: `*Entity`
  - Factories: `create*Entity`
- [ ] Consolidate similar patterns where beneficial
- [ ] Suggest improvements for complex or unclear APIs
- [ ] Check factory patterns are consistent (decomposed vs monolithic)

## 3. Type Safety Audit

- [ ] Find `any` type casts in `src/` (excluding tests)
- [ ] Review `as unknown as` casts - minimize where possible
- [ ] Find `unknown` types that could be narrowed with type guards
- [ ] Verify all exported functions have explicit return types
- [ ] Run `npm run typecheck` and address all warnings

## 4. Code Comments Review

- [ ] Check for outdated comments (wrong values, old behavior)
- [ ] Verify JSDoc accuracy (`@param`, `@returns` match code)
- [ ] Remove commented-out code (use git history instead)
- [ ] Ensure example code in comments still compiles

## 5. Test Coverage Analysis

- [ ] Run `npm run test:coverage` and check results
- [ ] Target: 90%+ coverage for game systems and utilities
- [ ] Identify untested critical paths
- [ ] Check for duplicate test assertions
- [ ] Run `npm run test:e2e` to verify E2E tests pass

## 6. Documentation Sync

- [ ] Update `CLAUDE.md` to reflect current patterns and versions
- [ ] Update `README.md` if setup/commands changed
- [ ] Verify `docs/*.md` accuracy (game-design, level-format, etc.)
- [ ] Check that documented file paths still exist

## 7. ECS Architecture Review

- [ ] Verify system registration order in `GameScene.ts` (dependencies respected)
- [ ] Check all systems with `init()` have corresponding `destroy()` cleanup
- [ ] Review event listener registration - ensure no duplicates on re-init
- [ ] Verify component `isAnimating` flags can't get stuck (soft-lock prevention)
- [ ] Check for orphaned entities after level transitions

## 8. Resource Management

- [ ] Review dynamic asset bundle creation (cleanup on level change)
- [ ] Check WeakMap registries for potential memory leaks
- [ ] Verify sprite/texture disposal on entity destruction
- [ ] Ensure TouchInput instances are properly destroyed

## 9. Magic Numbers Audit

- [ ] Extract hard-coded positions to layout constants
- [ ] Verify animation timing constants are centralized
- [ ] Check that Figma-derived values have source comments
- [ ] Ensure buffer tray layout matches `TRAY_FRAME_LAYOUT` pattern

## 10. Production Readiness

- [ ] Review debug `console.log` statements (should use debug utility)
- [ ] Check test harness code doesn't affect production builds
- [ ] Verify error handling covers edge cases
- [ ] Ensure no development-only code in production paths

## 11. Code Architecture (Prevent Spaghetti Code)

- [ ] Check file sizes - split files exceeding 400 lines into focused modules
- [ ] Verify single responsibility - each system/class does one thing well
- [ ] Review circular dependencies with `madge --circular src/`
- [ ] Check import depth - avoid deep relative imports (`../../../..`)
- [ ] Ensure clear layer separation:
  - `shared/` has no imports from `scenes/` or `ui/`
  - `scenes/` doesn't import from `ui/`
  - Components contain only data, no logic
- [ ] Review function complexity - break down functions with >3 levels of nesting
- [ ] Check coupling - systems should communicate via events, not direct references
- [ ] Verify no god objects (classes with too many responsibilities)

## 12. Test Quality Review

- [ ] Remove tests that only check implementation details (brittle tests)
- [ ] Check for tests with no meaningful assertions (`expect(true).toBe(true)`)
- [ ] Remove duplicate tests that verify the same behavior
- [ ] Ensure tests fail when they should (not always passing)
- [ ] Check test names describe expected behavior, not implementation
- [ ] Remove tests for deleted/deprecated features
- [ ] Verify mocks match actual API signatures
- [ ] Check for flaky tests (run `npm run test -- --retry=3`)

## 13. Bug Prevention Audit

- [ ] Check for off-by-one errors in loops and array access
- [ ] Verify null/undefined checks before property access
- [ ] Review async/await - ensure all promises are awaited or handled
- [ ] Check for race conditions in concurrent operations
- [ ] Verify event listeners don't fire after component destruction
- [ ] Check array mutations - no modifying arrays while iterating
- [ ] Review boundary conditions (empty arrays, zero values, max values)
- [ ] Check for division by zero possibilities
- [ ] Verify state consistency after error recovery

## 14. Log Cleanup

Remove unnecessary logging that clutters output and slows performance.

**Game code (`src/`):**
- [ ] Remove debug `console.log` statements (use conditional debug utility)
- [ ] Keep only error logs for critical failures
- [ ] Ensure no verbose logging in hot paths (update loops, animations)

**Unit tests (`tests/`):**
- [ ] Remove `console.log` from test files (use test assertions instead)
- [ ] Silence noisy mocks that log during tests
- [ ] Check for leftover debug prints in test utilities

**E2E tests (`e2e/`):**
- [ ] Remove debug logging from page interactions
- [ ] Keep only logs that help diagnose test failures
- [ ] Ensure screenshots/videos capture state instead of logs

```bash
# Find all console statements
grep -rn "console\.\(log\|warn\|info\|debug\)" src/ tests/ e2e/

# Find debug-only code blocks
grep -rn "if.*DEBUG\|if.*dev" src/
```

## 15. Pattern Refactoring

Identify and consolidate repeated code patterns.

**Detection:**
- [ ] Search for similar code blocks (3+ lines repeated in multiple files)
- [ ] Find copy-pasted logic with minor variations
- [ ] Identify repeated conditionals or switch statements
- [ ] Check for similar error handling patterns

**Common patterns to consolidate:**
- [ ] Entity creation patterns → extract to factory helpers
- [ ] Component access patterns → use `BaseSystem.getComponents<T>()`
- [ ] Event emission patterns → create typed event helpers
- [ ] Position/layout calculations → extract to geometry utilities
- [ ] Validation logic → create shared validators

**Refactoring checklist:**
- [ ] Extract repeated code to shared utility functions
- [ ] Create base classes for similar system behaviors
- [ ] Use generics to handle type variations
- [ ] Replace inline callbacks with named functions
- [ ] Consolidate similar test setup into fixtures

```bash
# Find potential duplicates (similar function signatures)
grep -rn "function\s\+\w\+\s*(.*)" src/ | sort | uniq -d

# Find repeated import patterns
grep -rn "^import.*from" src/ | cut -d: -f2 | sort | uniq -c | sort -rn | head -20

# Find similar method chains
grep -rn "\.\w\+().\w\+().\w\+()" src/
```

## 16. Clean Code Practices

### Naming
- [ ] Variables describe what they hold, not how they're used (`screwCount` not `tempVar`)
- [ ] Functions describe what they do (`calculateTotalScore` not `doStuff`)
- [ ] Boolean variables read as questions (`isAnimating`, `hasCompleted`, `canPlace`)
- [ ] Avoid abbreviations unless universally understood (`pos` → `position`)
- [ ] Use consistent terminology across codebase (don't mix `remove`/`delete`/`destroy`)

### Functions
- [ ] Functions do one thing (single responsibility)
- [ ] Functions are short (<30 lines preferred, <50 max)
- [ ] No more than 3 parameters (use options object if more needed)
- [ ] No side effects in query functions (getters shouldn't modify state)
- [ ] Early returns instead of deep nesting
- [ ] Avoid flag arguments (`render(true)` → `renderWithAnimation()`)

### Conditionals
- [ ] Positive conditions preferred (`if (isValid)` not `if (!isInvalid)`)
- [ ] Complex conditions extracted to named variables or functions
- [ ] No magic booleans in conditions (`if (count > MAX_SCREWS)` not `if (count > 5)`)
- [ ] Switch/case statements have default handlers
- [ ] Ternaries only for simple expressions (no nested ternaries)

### Error Handling
- [ ] Errors are handled at appropriate level (not swallowed)
- [ ] Error messages are descriptive and actionable
- [ ] No empty catch blocks
- [ ] Fail fast - validate inputs early
- [ ] Use specific error types when beneficial

### Code Organization
- [ ] Related code is grouped together
- [ ] Public methods before private methods
- [ ] Constants at top of file
- [ ] Imports organized (external → internal → types)
- [ ] No dead code or unreachable branches

```bash
# Find long functions (>50 lines between braces)
awk '/\{/{start=NR} /\}/{if(NR-start>50)print FILENAME":"start"-"NR}' src/**/*.ts

# Find functions with many parameters
grep -rn "function.*,.*,.*,.*," src/

# Find nested ternaries
grep -rn "?.*?.*:" src/
```

## 17. Final Validation

Run all checks to ensure nothing is broken:

```bash
# Full validation suite
npm run validate

# E2E tests (catches integration issues)
npm run test:e2e

# Build check (catches production-only issues)
npm run build
```

All commands must pass before maintenance is considered complete.

## Quick Commands

| Command | Purpose |
|---------|---------|
| `npm run validate` | Run all checks (typecheck, lint, format, test) |
| `npm run test:coverage` | Generate coverage report |
| `npm run test:e2e` | Run E2E tests |

## Grep Commands for Common Issues

```bash
# Find TODO/FIXME markers
grep -rn "TODO\|FIXME" src/

# Find eslint-disable comments
grep -rn "eslint-disable" src/

# Find type assertions that may need review
grep -rn "as unknown as" src/

# Find console statements (should use debug utility)
grep -rn "console\.\(log\|warn\|error\)" src/ --include="*.ts"

# Find magic numbers in layout code
grep -rn "x:\s*[0-9]\+\|y:\s*[0-9]\+" src/scenes/
```

## Known Technical Debt

Track items that need future attention:

| Item | Location | Priority | Notes |
|------|----------|----------|-------|
| Win/stuck UI handlers | `GameScene.ts:219,229` | High | Currently just console.log - need actual UI |
| Migrate systems to getComponents helper | Various systems | Low | `BaseSystem.getComponents<T>()` added - can migrate existing `as unknown as` casts |
