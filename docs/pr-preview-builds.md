# PR Preview Builds

Automated test builds are deployed for every pull request via **Cloudflare Workers**, allowing reviewers to test changes in a live environment before merging.

---

## How It Works

When a pull request is opened or updated:

1. **Cloudflare Workers Builds** automatically detects the branch
2. The game is built and deployed to a preview URL
3. Preview URL is available in the Cloudflare dashboard and PR checks

When a PR is merged or closed:

1. The preview deployment remains accessible for reference
2. Old preview deployments are automatically cleaned up by Cloudflare

---

## Accessing Preview Builds

### URL Format

```
https://<branch-name>.screw-master.pages.dev/
```

Or check the Cloudflare deployment status in the PR checks.

### Finding the URL

1. Open the pull request on GitHub
2. Look for the **Cloudflare Pages** check in the PR status
3. Click "Details" to see the preview URL

---

## Setup Requirements

### Cloudflare Environment Variables

| Variable | Purpose |
|----------|---------|
| `GITHUB_TOKEN` | Access `@play-co` private packages during npm install |

### Configuration

The `wrangler.toml` file in the repository root configures the deployment:

```toml
name = "screw-master"
compatibility_date = "2026-01-13"

[assets]
directory = "./dist"
```

---

## Troubleshooting

### Preview Not Loading

**Symptom**: 404 error or blank page at preview URL

**Solutions**:
1. Check if the Cloudflare build completed successfully
2. Wait a minute for the deployment to propagate
3. Hard refresh the page (Ctrl+Shift+R / Cmd+Shift+R)

### Build Failing

**Symptom**: Cloudflare build fails

**Solutions**:
1. Check the Cloudflare dashboard for error details
2. Common issues:
   - TypeScript errors: Fix type errors locally first
   - Missing dependencies: Ensure `package-lock.json` is committed
   - Token issues: Verify `GITHUB_TOKEN` environment variable is set

### Assets Not Loading

**Symptom**: Game loads but images/sounds are missing

**Solutions**:
1. Check browser console for 404 errors
2. Verify assets use relative paths

---

## Related Documentation

- [Feature Development Guide](feature-development-guide.md) - Development workflow
- [Game Architecture](game-architecture.md) - Technical overview of the game
