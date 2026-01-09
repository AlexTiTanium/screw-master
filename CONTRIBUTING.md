# Contributing to Screw Master

Thank you for contributing to Screw Master! Please follow these guidelines when submitting pull requests.

## Pull Request Checklist

Before submitting a PR, ensure the following:

- [ ] Added screenshots for game level changes (attach to PR description)
- [ ] Any visual work was verified with E2E tests
- [ ] Unit test coverage is not below 90%
- [ ] All new code is covered by unit tests

## Development Workflow

1. Create a feature branch from `main`
2. Make your changes
3. Run validation: `npm run validate`
4. Create a PR with a clear description

## Running Tests

```bash
# Run all checks
npm run validate

# Run unit tests with coverage
npm run test -- --coverage

# Run E2E tests
npm run test:e2e

# Take screenshots for PR
npx playwright test screenshot --project=chromium
```

## Adding Screenshots to PRs

Screenshots should be displayed in a table format to avoid full-size images overwhelming the PR description.

### 1. Generate screenshots

```bash
npx playwright test screenshot --project=chromium
```

### 2. Upload to GitHub Release

```bash
# Create release (first time only)
gh release create pr-screenshots --title "PR Screenshots" --notes "Screenshots for PRs"

# Upload screenshots (use --clobber to replace existing)
gh release upload pr-screenshots screenshots/*.png --clobber
```

### 3. Add to PR description

Use a table with thumbnail-sized images:

```markdown
## Screenshots

| Mobile (390x844) | Tablet (820x1180) | Desktop (1920x1080) |
|:---:|:---:|:---:|
| <img src="https://github.com/OWNER/REPO/releases/download/pr-screenshots/game-mobile-390x844.png" width="200"> | <img src="https://github.com/OWNER/REPO/releases/download/pr-screenshots/game-tablet-820x1180.png" width="200"> | <img src="https://github.com/OWNER/REPO/releases/download/pr-screenshots/game-desktop-1920x1080.png" width="200"> |
```

## Code Quality Standards

- TypeScript strict mode is enabled
- ESLint with type-checked rules
- Prettier for formatting
- All tests must pass before merge
