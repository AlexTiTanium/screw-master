---
description: Guide through test-first bug fixing workflow for Screw Master
allowed-tools: ["Read", "Write", "Edit", "Glob", "Grep", "Bash", "TodoWrite", "Task"]
argument-hint: "[bug-report-path] or describe the bug"
---

# Bug Fixing Workflow

Follow the test-first bug fixing workflow documented in `docs/bug-fixing-workflow.md`.

## Process

1. **Understand the bug**
   - If a bug report path is provided, read all files in the bug report directory:
     - `screenshot.png` - Visual state when bug occurred
     - `render-graph.json` - PixiJS display tree with UIDs
     - `game-state.json` - Full ECS entities and components
     - `console-log.txt` - All logs with tick numbers
     - `report.json` - Metadata and user actions
   - If no report provided, ask the user to describe the bug clearly

2. **Create TodoWrite task list**
   Create a todo list with these items:
   - Analyze bug report/description
   - Create E2E test to reproduce bug
   - Verify test fails
   - Implement fix
   - Verify test passes
   - Run full validation

3. **Create failing E2E test**
   - Create test in `e2e/specs/` directory
   - Use `window.__gameTest` API to replay user actions from bug report
   - Add assertions that demonstrate the bug
   - Run test to confirm it FAILS (this proves the bug exists)

4. **Correlate bug report data**
   Use these correlations to understand the bug:
   - `uid` in render-graph.json matches `view2d.viewUid` in game-state.json
   - `entityUid` in render-graph.json matches `entities[].id` in game-state.json
   - Console logs include tick numbers for timeline reconstruction

5. **Implement the fix**
   - Identify the root cause (which system, component, or event flow)
   - Make minimal changes to fix the bug
   - Follow project patterns (event-driven, proper component access)

6. **Verify fix**
   - Run the E2E test - must now PASS
   - Run unit tests: `npm run test`
   - Run full validation: `npm run validate`
   - Run E2E tests: `npm run test:e2e`

7. **Complete**
   - Mark all todos complete
   - Summarize the root cause and fix applied

## E2E Test Template

```typescript
import { test, expect } from '@playwright/test';

test('bug description - reproduces issue', async ({ page }) => {
  await page.goto('/?testMode');
  await page.waitForFunction(() => window.__gameTest?.ready === true);

  // Replay user actions from bug report
  await page.evaluate(async () => {
    await window.__gameTest?.act({ type: 'pointerDown', x: 100, y: 100 });
    await window.__gameTest?.act({ type: 'pointerUp', x: 100, y: 100 });
  });

  // Assert the bug condition
  const state = await page.evaluate(() => window.__gameTest?.getState());
  expect(state.someProperty).toBe(expectedValue);
});
```

## Reference Files

- Bug fixing workflow: `docs/bug-fixing-workflow.md`
- Test harness API: `src/shared/debug/TestHarness.ts`
- E2E test examples: `e2e/specs/`
