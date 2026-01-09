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

## Code Quality Standards

- TypeScript strict mode is enabled
- ESLint with type-checked rules
- Prettier for formatting
- All tests must pass before merge
