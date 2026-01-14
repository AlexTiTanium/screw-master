---
description: Guide through 9-phase TDD feature development workflow for Screw Master
allowed-tools: ["Read", "Write", "Edit", "Glob", "Grep", "Bash", "TodoWrite", "Task", "AskUserQuestion"]
argument-hint: "<feature description>"
---

# Feature Development Workflow

Follow the 9-phase TDD workflow documented in `docs/feature-development-guide.md`.

## Phase 1: Planning & Requirements

1. **Analyze the feature request**
   - Read relevant documentation (game-design.md, game-architecture.md)
   - Identify which systems, components, or entities need changes
   - Determine if this is a new system, component, animation, or modification

2. **Ask clarifying questions**
   Use AskUserQuestion to clarify:
   - Exact behavior expected
   - Edge cases to handle
   - UI/visual requirements
   - Performance considerations

3. **Create TodoWrite task list**
   Break down the feature into specific implementation steps:
   - Each test to write
   - Each file to modify/create
   - Validation steps

## Phase 2: Branch Setup

1. **Create feature branch**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/<feature-name>
   ```

2. **Branch naming conventions**:
   - `feature/add-*` - New features
   - `fix/*` - Bug fixes
   - `refactor/*` - Code improvements
   - `docs/*` - Documentation only

## Phase 3: Test-First Development (TDD)

**CRITICAL**: Write tests BEFORE implementation.

1. **Write unit tests** in `tests/unit/` or `tests/integration/`
   - Follow existing mock patterns
   - Test component state changes
   - Test system behavior

2. **Write E2E tests** in `e2e/specs/`
   - Use `window.__gameTest` API
   - Test user interactions
   - Test visual outcomes

3. **Run tests - they MUST FAIL**
   ```bash
   npm run test
   npm run test:e2e
   ```
   If tests pass before implementation, they're not testing the right thing.

## Phase 4: Implementation

1. **Follow project architecture patterns**
   - Systems extend `BaseSystem`
   - Use `defineComponent()` helper for components
   - Use entity factories for entity creation
   - Communicate via `GameEventBus`, not direct calls

2. **Implement incrementally**
   - Make one test pass at a time
   - Commit working increments

3. **Code quality standards**
   - Type-safe component access via `getComponents<T>()`
   - Event subscriptions in `init()`, cleanup in `destroy()`
   - Animation cleanup with try/finally

## Phase 5: Validation & Quality

Run all validation checks:
```bash
npm run validate  # typecheck + lint + format + test
npm run test:e2e  # E2E tests
npm run build     # Production build
```

ALL must pass before proceeding.

## Phase 6: Visual Documentation

**Required for UI changes**:

1. **Record demo video**
   ```bash
   npm run test:e2e -- --grep "demo"
   ```

2. **Convert to GIF**
   ```bash
   ffmpeg -y -i video.webm \
     -vf "fps=12,scale=270:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer" \
     -loop 0 demo.gif
   ```

3. **Upload to GitHub release** for PR embedding

## Phase 7: Commit & PR Creation

1. **Stage and commit**
   ```bash
   git add -A
   git commit -m "feat: <description>

   Co-Authored-By: Claude <noreply@anthropic.com>"
   ```

2. **Push branch**
   ```bash
   git push -u origin feature/<feature-name>
   ```

3. **Create PR** with demo GIF in body

## Phase 8: Preview Build Verification

1. Wait for PR Preview GitHub Action to complete
2. Open the preview URL
3. Test the feature in the preview build
4. Verify game loads and feature works

## Phase 9: User Review & Feedback

1. Request user review
2. Address feedback (repeat phases 3-7 as needed)
3. Get approval

## Reference Files

- Feature development guide: `docs/feature-development-guide.md`
- Game architecture: `docs/game-architecture.md`
- ECS patterns: See `src/scenes/game/systems/` for examples
- Test patterns: See `tests/` and `e2e/specs/`
