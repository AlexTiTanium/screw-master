# Maintenance Guide

Execute this guide periodically after major features to maintain code quality.

## 1. Code Consistency Check

- [ ] Find and address empty functions/stubs (`TODO`, `FIXME` markers)
- [ ] Check for code duplication in factories, systems, and utilities
- [ ] Verify naming conventions via `npm run lint`
- [ ] Remove unused imports/variables via `npm run typecheck`
- [ ] Remove dead code paths

## 2. API Improvement Analysis

- [ ] Review public interfaces in `src/shared/types/` for completeness
- [ ] Verify naming follows conventions:
  - Components: `*Component`
  - Systems: `*System`
  - Entities: `*Entity`
  - Factories: `create*Entity`
- [ ] Consolidate similar patterns where beneficial
- [ ] Suggest improvements for complex or unclear APIs

## 3. Type Safety Audit

- [ ] Find `any` type casts in `src/` (excluding tests)
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

## Quick Commands

| Command | Purpose |
|---------|---------|
| `npm run validate` | Run all checks (typecheck, lint, format, test) |
| `npm run test:coverage` | Generate coverage report |
| `npm run test:e2e` | Run E2E tests |
