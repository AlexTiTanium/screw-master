# Feature Development Guide

A structured workflow for AI agents developing new features in this codebase.

---

## IMPORTANT: Instructions for AI Agents

**You MUST follow this workflow exactly. Do NOT skip phases or take shortcuts.**

### Required Workflow

1. **Create a TodoWrite todo list FIRST** before any work
   - Add all 9 phases as top-level todos
   - Mark each phase as `pending`

2. **For EACH phase**, you must:
   - Mark the phase as `in_progress`
   - Complete ALL steps in that phase
   - Mark phase as `completed` only when ALL steps are done

3. **DO NOT**:
   - Skip the planning phase and jump to implementation
   - Write implementation code before tests
   - Create a PR before validation passes
   - Merge without user approval

4. **If blocked**:
   - Document WHY you're blocked
   - Ask the user for help or clarification
   - Do not proceed with assumptions

---

## Workflow Overview

```
┌───────────────────────────────────────────────────────────────────────────┐
│                      FEATURE DEVELOPMENT WORKFLOW                          │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐             │
│  │ Phase 1  │───▶│ Phase 2  │───▶│ Phase 3  │───▶│ Phase 4  │             │
│  │ Planning │    │ Branch   │    │ Tests    │    │ Implement│             │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘             │
│                                        │              │                    │
│                                        ▼              ▼                    │
│                                   Tests FAIL    Tests PASS                 │
│                                                                            │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐             │
│  │ Phase 9  │◀───│ Phase 8  │◀───│ Phase 7  │◀───│ Phase 5  │             │
│  │ Review   │    │ Preview  │    │ PR       │    │ Validate │             │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘             │
│       │              │                                ▲                    │
│       │              │         ┌──────────┐          │                    │
│       │              └────────▶│ Phase 6  │──────────┘                    │
│       ▼                        │ Visual   │                               │
│  Feedback? ───▶ Loop back to Phase 4 until approved                       │
│                                                                            │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Planning & Requirements

> Before writing any code, ensure you fully understand what needs to be built.

### Steps

1. **Analyze the feature request**
   - Read the user's requirements carefully
   - Identify what systems/components will be affected
   - Reference [docs/game-architecture.md](game-architecture.md) for existing patterns

2. **Ask clarifying questions**
   - Use `AskUserQuestion` tool to resolve ambiguities
   - Present implementation options if multiple approaches exist
   - Confirm scope boundaries (what's included vs. out of scope)

3. **Present options to user**
   - If there are architectural choices, present them with trade-offs
   - Let the user decide on approach before proceeding

4. **Create TodoWrite task list**
   - Add all 9 phases as top-level todos
   - Break down Phase 4 (Implementation) into specific sub-tasks
   - Include file paths that will be created/modified

### Example Questions to Ask

```
- "Should this feature support [edge case]?"
- "Which approach do you prefer: [Option A] or [Option B]?"
- "Is this feature behind a feature flag or always enabled?"
- "What should happen when [error condition]?"
```

---

## Phase 2: Branch Setup

> Create a clean feature branch synced with the latest main branch.

### Branch Naming Conventions

| Prefix | Use Case | Example |
|--------|----------|---------|
| `feature/` | New functionality | `feature/add-screw-animation` |
| `fix/` | Bug fixes | `fix/tray-overflow-crash` |
| `refactor/` | Code improvements | `refactor/extract-animation-system` |
| `docs/` | Documentation only | `docs/add-level-design-guide` |

### Commands

```bash
# Ensure main is up to date
git fetch origin
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/<feature-name>

# Verify branch is clean and synced
git status
git log --oneline -5
```

### Verification

- [ ] Branch name follows convention
- [ ] Branch is based on latest main
- [ ] No uncommitted changes from previous work

---

## Phase 3: Test-First Development (TDD)

> Write tests BEFORE implementation. Tests must FAIL initially.

### Why TDD?

- Forces clear understanding of requirements
- Tests serve as executable specification
- Prevents over-engineering
- Catches regressions early

### Unit Tests (tests/ directory)

1. **Identify what to test**
   - New functions/methods
   - New component behaviors
   - Edge cases and error handling

2. **Create test file**
   - Location: `tests/<category>/<feature>.test.ts`
   - Follow existing test patterns in the codebase

3. **Write failing tests**
   ```typescript
   import { describe, it, expect } from 'vitest';
   import { newFeatureFunction } from '@shared/utils';

   describe('newFeatureFunction', () => {
     it('should handle normal case', () => {
       const result = newFeatureFunction(input);
       expect(result).toBe(expectedOutput);
     });

     it('should handle edge case', () => {
       const result = newFeatureFunction(edgeInput);
       expect(result).toBe(edgeExpectedOutput);
     });
   });
   ```

### E2E Tests (e2e/ directory)

**Required for**: UI changes, visual features, user interactions

1. **Create E2E test file**
   - Location: `e2e/specs/<feature>.spec.ts`

2. **Write failing E2E test**
   ```typescript
   import { test, expect } from '@playwright/test';

   test.describe('Feature Name', () => {
     test('should perform expected behavior', async ({ page }) => {
       await page.goto('/?testMode');
       await page.waitForFunction(() => window.__gameTest?.ready === true);

       // Perform actions
       await page.evaluate(async () => {
         await window.__gameTest?.act({ type: 'pointerDown', x: 100, y: 100 });
       });

       // Assert expected state
       const state = await page.evaluate(() =>
         window.__gameTest?.getState()
       );
       expect(state.someProperty).toBe(expectedValue);
     });
   });
   ```

### Run Tests (Must FAIL)

```bash
# Run unit tests
npm run test -- --grep "newFeatureFunction"

# Run E2E tests
npm run test:e2e -- --grep "Feature Name"
```

**Expected output**: Tests should FAIL because the feature doesn't exist yet.

---

## Phase 4: Implementation

> Write the minimum code needed to make tests pass.

### Guidelines

1. **Follow architecture patterns**
   - Reference [docs/game-architecture.md](game-architecture.md)
   - Use existing patterns for systems, components, entities
   - Communicate between systems via events, not direct calls

2. **Implement incrementally**
   - Start with the simplest test case
   - Run tests after each change
   - Commit when a logical unit is complete

3. **Code quality**
   - Follow [docs/maintenance-guide.md](maintenance-guide.md) standards
   - No magic numbers (use constants)
   - Add JSDoc for public APIs
   - Handle errors appropriately

### Run Tests (Must PASS)

```bash
# Run unit tests
npm run test

# Watch mode for rapid iteration
npm run test -- --watch
```

**Mark TodoWrite items as completed** as each test passes.

---

## Phase 5: Validation & Quality

> Ensure all checks pass before proceeding.

### Required Commands

```bash
# Full validation suite (typecheck + lint + format + test)
npm run validate

# E2E tests
npm run test:e2e

# Production build
npm run build
```

**All commands MUST pass.** If any fail:

1. Fix the issues
2. Re-run the failing command
3. Do not proceed until all pass

### Checklist

- [ ] `npm run validate` passes
- [ ] `npm run test:e2e` passes
- [ ] `npm run build` succeeds
- [ ] No new TypeScript errors
- [ ] No new ESLint warnings

---

## Phase 6: Visual Documentation

> Record demos for UI changes to include in the PR.

### When Required

| Feature Type | Video/Screenshot Required? |
|--------------|---------------------------|
| UI changes | **Yes** |
| Animations | **Yes** |
| Visual feedback | **Yes** |
| New screens/dialogs | **Yes** |
| Backend logic only | No |
| Refactoring (no visual change) | No |
| Bug fixes (no visual change) | No |

### Recording Demo Video

1. **Create E2E test for recording**
   ```typescript
   // e2e/specs/feature-demo.spec.ts
   import { test } from '@playwright/test';

   test.use({
     video: { mode: 'on', size: { width: 360, height: 640 } },
     viewport: { width: 360, height: 640 },
   });

   test('feature demo for PR', async ({ page }) => {
     await page.goto('/?testMode&skipIntro');
     await page.waitForFunction(() => window.__gameTest?.ready === true);

     // Demonstrate the feature step by step
     // ...
   });
   ```

2. **Run the demo test**
   ```bash
   npm run test:e2e -- --grep "feature demo"
   ```

3. **Convert to GIF**
   ```bash
   ffmpeg -y -i "e2e/test-results/<test-folder>/video.webm" \
     -vf "fps=12,scale=270:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer" \
     -loop 0 e2e/screenshots/feature-demo.gif
   ```

4. **Upload to GitHub release**
   ```bash
   gh release upload <tag> e2e/screenshots/feature-demo.gif --clobber
   ```

### Screenshots

For static UI changes, screenshots may suffice:

```typescript
// In E2E test
await page.screenshot({
  path: 'e2e/screenshots/feature-state.png',
  fullPage: false,
});
```

---

## Phase 7: Commit & PR Creation

> Create a well-documented PR with all supporting materials.

### Commit Changes

```bash
# Stage changes
git add .

# Create commit with descriptive message
git commit -m "$(cat <<'EOF'
Add <feature-name>: <brief description>

- Implemented <component/system> for <purpose>
- Added unit tests for <what>
- Added E2E tests for <what>

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

### Push Branch

```bash
git push -u origin feature/<feature-name>
```

### Create Pull Request

```bash
gh pr create --title "Add <feature-name>" --body "$(cat <<'EOF'
## Summary
- <1-3 bullet points describing what was done>

## Preview
<!-- Automated preview will be posted as a comment once the build completes -->

## Demo

![Feature Demo](https://github.com/<owner>/<repo>/releases/download/<tag>/feature-demo.gif)

## Test plan
- [ ] Unit tests pass (`npm run test`)
- [ ] E2E tests pass (`npm run test:e2e`)
- [ ] Preview build loads and works
- [ ] Manual testing: <specific steps to verify>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

### PR Checklist

- [ ] Title is descriptive
- [ ] Summary explains what was done
- [ ] Demo video/screenshots attached (if UI change)
- [ ] Test plan is specific and actionable

---

## Phase 8: Preview Build Verification

> Verify the automated preview build succeeds and the game is playable.

### What Happens Automatically

When you push to a PR branch:

1. **GitHub Actions** triggers the `pr-preview.yml` workflow
2. The game is built and deployed to GitHub Pages
3. A **sticky comment** is posted on the PR with the preview URL

### Preview URL Format

```
https://alextitanium.github.io/screw-master/pr-preview/pr-<number>/
```

### Verification Steps

1. **Wait for GitHub Actions to complete**
   - Check the PR's "Checks" section
   - Wait for the "PR Preview" workflow to show green checkmark

2. **Open the preview URL**
   - Look for the bot comment on the PR with the preview link
   - Click the link to open the preview in a new tab

3. **Test the feature**
   - Verify the game loads without errors
   - Test the specific feature you implemented
   - Check browser console for errors

4. **If build fails**
   - Check the Actions tab for error details
   - Fix the issue and push again
   - See [PR Preview Builds](pr-preview-builds.md) for troubleshooting

### Checklist

- [ ] PR Preview workflow completed successfully
- [ ] Preview URL is accessible
- [ ] Game loads without errors
- [ ] Feature works as expected in preview
- [ ] No console errors related to the feature

---

## Phase 9: User Review & Feedback Loop

> Present the feature to the user and iterate until approved.

### Ask for Review

After creating the PR and verifying the preview, notify the user:

```
The feature has been implemented and a PR has been created:
<PR URL>

Please review:
1. The code changes in the PR
2. The live preview: <preview URL>
3. The demo video/screenshots

Let me know if you have any feedback or changes needed.
```

### Handle Feedback

When user provides feedback:

1. **Understand the feedback**
   - Ask clarifying questions if needed
   - Confirm what changes are required

2. **Update implementation**
   - Modify code to address feedback
   - Update tests if requirements changed

3. **Re-validate**
   - Run `npm run validate`
   - Run `npm run test:e2e`
   - Ensure all checks still pass

4. **Update PR**
   - Commit changes with descriptive message
   - Push to the same branch
   - Preview will automatically rebuild
   - Update PR description if scope changed

5. **Request re-review**
   - Notify user that changes have been made
   - Summarize what was changed
   - Share updated preview URL

### Iterate Until Approved

Continue the feedback loop until the user explicitly approves:

```
User: "Looks good! Ready to merge."
```

Only then should the PR be considered complete.

---

## Quick Commands

| Task | Command |
|------|---------|
| Run all tests | `npm run test` |
| Run specific test | `npm run test -- --grep "test name"` |
| Run E2E tests | `npm run test:e2e` |
| Run specific E2E test | `npm run test:e2e -- --grep "test name"` |
| Full validation | `npm run validate` |
| Build | `npm run build` |
| Create branch | `git checkout -b feature/<name>` |
| Push branch | `git push -u origin feature/<name>` |
| Create PR | `gh pr create --title "..." --body "..."` |
| Convert video to GIF | See Phase 6 ffmpeg command |

---

## TodoWrite Template for AI Agents

Copy this structure when starting feature development:

```
Phase 1: Planning & Requirements
Phase 2: Branch Setup
Phase 3: Test-First Development (TDD)
  - Write unit tests for <feature>
  - Write E2E tests for <feature>
  - Verify tests FAIL
Phase 4: Implementation
  - Implement <component/system 1>
  - Implement <component/system 2>
  - Run tests and verify PASS
Phase 5: Validation & Quality
  - Run npm run validate
  - Run npm run test:e2e
  - Run npm run build
Phase 6: Visual Documentation
  - Record demo video
  - Convert to GIF
  - Upload to GitHub release
Phase 7: Commit & PR Creation
  - Commit changes
  - Push branch
  - Create PR with demo
Phase 8: Preview Build Verification
  - Wait for PR Preview workflow to complete
  - Open preview URL and verify game loads
  - Test feature in preview build
Phase 9: User Review & Feedback
  - Share PR and preview URL with user
  - Implement feedback
  - Get approval
```

**Remember**: Mark `completed` ONLY after all steps in a phase are done.

---

## Common Pitfalls

| Pitfall | Why It's a Problem | How to Avoid |
|---------|-------------------|--------------|
| Skipping TDD | Tests become afterthought, may not cover edge cases | Always write tests first, verify they fail |
| Not syncing with main | Merge conflicts, outdated code | Always `git pull origin main` before starting |
| Missing visual docs | PR reviewers can't see what changed | Record video for any UI change |
| PR before validation | Broken code in PR, wasted review time | All checks must pass before PR |
| Not checking preview | Reviewer gets broken preview, wasted time | Always verify preview loads before requesting review |
| Assuming approval | User may have feedback not yet expressed | Wait for explicit "approved" or "ready to merge" |
| Large commits | Hard to review, hard to revert | Commit logical units incrementally |
| Vague PR descriptions | Reviewers don't understand changes | Include summary, demo, and test plan |

---

## Related Documentation

- [PR Preview Builds](pr-preview-builds.md) - Detailed preview system documentation
- [Game Architecture](game-architecture.md) - System architecture and patterns
- [Maintenance Guide](maintenance-guide.md) - Code quality standards

---

## Document History

| Date | Change |
|------|--------|
| 2026-01-13 | Added Phase 8: Preview Build Verification |
| 2026-01-13 | Initial feature development guide created |
