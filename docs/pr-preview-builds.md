# PR Preview Builds

Automated test builds are deployed for every pull request, allowing reviewers to test changes in a live environment before merging. This enables faster feedback cycles and ensures features work correctly before merging.

---

## How It Works

When a pull request is opened or updated:

1. **GitHub Actions** triggers the `pr-preview.yml` workflow
2. The game is built with the PR-specific base path
3. Built files are deployed to the `gh-pages` branch under `pr-preview/pr-{number}/`
4. A **sticky comment** is posted on the PR with the preview URL

When a PR is closed (merged or abandoned):

1. The cleanup job removes the preview directory
2. The PR comment remains for reference

---

## Accessing Preview Builds

### URL Format

```
https://alextitanium.github.io/screw-master/pr-preview/pr-{number}/
```

Replace `{number}` with the PR number (e.g., `pr-42`).

### Finding the URL

1. Open the pull request on GitHub
2. Look for the **sticky comment** from the PR Preview bot
3. Click the preview link in the comment

---

## Workflow Details

### Triggers

| Event | Action |
|-------|--------|
| PR opened | Build and deploy preview |
| PR synchronized (new commits) | Rebuild and update preview |
| PR reopened | Rebuild and deploy preview |
| PR closed | Remove preview |

### Build Process

1. Checkout code
2. Install dependencies (using `NPM_TOKEN` for private packages)
3. Run production build (`npm run build`)
4. Deploy to `gh-pages` branch

### Concurrency

- Each PR has its own concurrency group
- New commits cancel in-progress builds for the same PR
- Different PRs build in parallel

---

## Setup Requirements

### Repository Secrets

| Secret | Purpose | How to Create |
|--------|---------|---------------|
| `NPM_TOKEN` | Access `@play-co` private packages | Create PAT with `read:packages` scope at [GitHub Settings](https://github.com/settings/tokens) |

### GitHub Pages Configuration

1. Go to repository **Settings > Pages**
2. Source: **GitHub Actions**
3. Save

> **Note**: Main branch deployments use `deploy-pages.yml` workflow with `actions/deploy-pages`. PR previews still use the `gh-pages` branch via `rossjrw/pr-preview-action`.

---

## Troubleshooting

### Preview Not Loading

**Symptom**: 404 error or blank page at preview URL

**Solutions**:
1. Check if the workflow completed successfully (Actions tab)
2. Wait a few minutes for GitHub Pages to propagate
3. Hard refresh the page (Ctrl+Shift+R / Cmd+Shift+R)
4. Check browser console for asset loading errors

### Build Failing

**Symptom**: Workflow fails during build step

**Solutions**:
1. Check the Actions tab for error details
2. Common issues:
   - TypeScript errors: Fix type errors locally first
   - Missing dependencies: Ensure `package-lock.json` is committed
   - Token issues: Verify `NPM_TOKEN` secret is set correctly

### Assets Not Loading

**Symptom**: Game loads but images/sounds are missing

**Solutions**:
1. Check browser console for 404 errors
2. Verify assets use relative paths (not absolute `/assets/...`)
3. Ensure `VITE_BASE_PATH` is set correctly in the workflow

### Preview Not Updating

**Symptom**: Preview shows old version after pushing commits

**Solutions**:
1. Check if a new workflow run was triggered (Actions tab)
2. Wait for the workflow to complete
3. Hard refresh the preview page
4. Check for concurrency issues (previous build might still be running)

### Private Package Authentication

**Symptom**: `npm ci` fails with 401/404 for `@play-co` packages

**Solutions**:
1. Verify `NPM_TOKEN` secret exists in repository settings
2. Ensure the PAT has `read:packages` scope
3. Check if the PAT has expired
4. Verify the PAT has access to the `@play-co` organization

---

## Manual Actions

### Re-run a Build

1. Go to the **Actions** tab
2. Find the failed/old workflow run
3. Click **Re-run all jobs**

### Manually Trigger Build

The workflow only triggers on PR events. To manually rebuild:

1. Push an empty commit: `git commit --allow-empty -m "Trigger rebuild"`
2. Or close and reopen the PR

---

## Storage and Cleanup

- Each preview is approximately **11MB** (images + compiled code)
- Previews are automatically removed when PRs close
- Only the latest build is kept for each PR
- Orphaned previews may need manual cleanup if workflow fails during removal

---

## Related Documentation

- [Feature Development Guide](feature-development-guide.md) - Includes Phase 7.5 for preview verification
- [Game Architecture](game-architecture.md) - Technical overview of the game
