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
| Win/stuck UI handlers | `GameScene.ts:219,229` | High | Currently just console.log |
| System names in test harness | `renderSignature.ts:121` | Low | TODO comment |
| Buffer tray layout constants | `GameScene.ts:74-82` | Medium | Should match TRAY_FRAME_LAYOUT pattern |
| Component access helper | `BaseSystem.ts` | Medium | Could reduce `as unknown as` casts |
