---
description: Run 18-section maintenance checklist for Screw Master codebase
allowed-tools: ["Read", "Write", "Edit", "Glob", "Grep", "Bash", "TodoWrite", "Task"]
argument-hint: "[section-number] or 'all' for full maintenance"
---

# Maintenance Workflow

Run the periodic maintenance checklist from `docs/maintenance-guide.md`.

## Process

1. **Create master todo list**
   Create a TodoWrite list with all 18 sections (or specified section):

   1. Code Consistency Check
   2. API Improvement Analysis
   3. Type Safety Audit
   4. Code Comments Review
   5. Test Coverage Analysis
   6. Documentation Sync
   7. ECS Architecture Review
   8. Resource Management
   9. Magic Numbers Audit
   10. Production Readiness
   11. Code Architecture (Spaghetti Prevention)
   12. Test Quality Review
   13. Bug Prevention Audit
   14. Log Cleanup
   15. Pattern Refactoring
   16. Clean Code Practices
   17. Architecture Documentation Update
   18. Final Validation

2. **Execute each section**
   Mark section as `in_progress`, run all checks, create sub-todos for issues found, fix issues, mark as `completed`.

## Section Details

### 1. Code Consistency Check
```bash
# Find TODO/FIXME comments
grep -rn "TODO\|FIXME" src/

# Find duplicate patterns (manual review)
# Check for unused imports
```

### 2. API Improvement Analysis
- Review public interfaces in `src/shared/`
- Check naming conventions
- Look for consolidation opportunities

### 3. Type Safety Audit
```bash
# Find 'any' casts
grep -rn ": any" src/
grep -rn "as any" src/

# Find 'unknown' that could be narrowed
grep -rn ": unknown" src/
```

### 4. Code Comments Review
- Check for outdated comments
- Verify JSDoc accuracy
- Remove dead code comments

### 5. Test Coverage Analysis
```bash
npm run test -- --coverage
```
Target: 90%+ coverage on critical paths

### 6. Documentation Sync
- Verify CLAUDE.md is current
- Check README.md accuracy
- Update docs/*.md if patterns changed

### 7. ECS Architecture Review
- Verify system registration order in `GameScene.ts`
- Check cleanup patterns in systems
- Review event bus usage

### 8. Resource Management
- Check asset bundle cleanup
- Look for memory leaks (WeakMap usage)
- Verify sprite disposal

### 9. Magic Numbers Audit
```bash
# Find hardcoded positions/sizes
grep -rn "position.*[0-9]\{3\}" src/scenes/
```
Extract to layout constants

### 10. Production Readiness
- Review debug logs (remove or gate)
- Check test harness isolation
- Verify error handling

### 11. Code Architecture (Spaghetti Prevention)
- Files should be <400 lines
- Single responsibility per file
- Check for circular dependencies

### 12. Test Quality Review
- Remove brittle tests
- Remove duplicate tests
- Verify tests actually fail when code breaks

### 13. Bug Prevention Audit
- Off-by-one errors
- Null/undefined checks
- Async handling
- Race conditions

### 14. Log Cleanup
```bash
# Find debug console.log
grep -rn "console.log" src/

# Should only exist in debug utilities
```

### 15. Pattern Refactoring
- Find repeated code (3+ lines in multiple files)
- Consolidate into utilities

### 16. Clean Code Practices
- Descriptive naming
- Functions <30 lines
- Simplified conditionals
- Proper error handling

### 17. Architecture Documentation Update
If any systems/components changed:
- Update `docs/game-architecture.md`
- Update system registration order
- Update event list

### 18. Final Validation
```bash
npm run validate    # typecheck + lint + format + test
npm run test:e2e    # E2E tests
npm run build       # Production build
```
ALL must pass.

## Output

After completing all sections:
1. Summarize issues found and fixed
2. List any deferred items (with reasons)
3. Update technical debt table if needed
4. Report final validation status

## Reference Files

- Maintenance guide: `docs/maintenance-guide.md`
- Architecture: `docs/game-architecture.md`
- CLAUDE.md for current patterns
