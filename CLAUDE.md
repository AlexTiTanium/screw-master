# Screw Master - Claude Code Context

This file provides context for Claude Code sessions working on this project.

## Documentation

- [Game Design Document](docs/game-design.md) - Core game mechanics, physics system, and MVP scope
- [Game Architecture](docs/game-architecture.md) - System architecture, extension guides, and future development
- [Art Direction Guide](docs/art-direction.md) - Visual style, materials, and asset requirements for artists
- [Level Design Guide](docs/level-design.md) - Puzzle structure, difficulty progression, and design rules
- [Level Format Spec](docs/level-format.md) - Technical specification for level and region JSON files
- [Maintenance Guide](docs/maintenance-guide.md) - Periodic maintenance checklist for AI agents

## Tech Stack

- **Runtime**: Node.js 22+
- **Language**: TypeScript 5.9
- **Build Tool**: Vite 7.2
- **Test Framework**: Vitest (unit/integration), Playwright (E2E)
- **Linting**: ESLint 9 (flat config)
- **Formatting**: Prettier 3.4

## Private Dependencies

All `@play-co` packages are installed from GitHub Packages registry.

**Required**: Set `GITHUB_TOKEN` environment variable with read access to play-co org.

| Package | Version | Purpose |
|---------|---------|---------|
| `@play-co/astro` | 11.2.0 | Application framework (screens, plugins) |
| `@play-co/odie` | 13.3.x (pinned) | ECS game framework (scenes, entities, components, systems) |
| `@play-co/pixijs` | 8.14.2 | PixiJS v8 fork (aliased as `pixi.js`) |
| `@play-co/commons` | ^2.0.0 | Shared utilities |

## Architecture

```
Astro Application (top-level)
    ├── StagePlugin (PixiJS renderer)
    ├── ResizePlugin (viewport scaling)
    ├── ResourcePlugin (asset loading)
    ├── KeyboardPlugin (keyboard input)
    └── ScreensPlugin
            └── GameScreen (Astro screen)
                    └── GameScene (ODIE Scene2D)
                            ├── Systems (game logic)
                            └── Entities (game objects)
                                    └── Components (data)
```

**Key Pattern**: Astro manages application lifecycle and screens. ODIE Scene2D is embedded inside Astro screens for game logic and rendering.

## Project Structure

```
src/
├── app/              # Application bootstrap and config
│   ├── bootstrap.ts  # App initialization with plugins
│   └── config.ts     # Game configuration (width, height, etc.)
│
├── ui/               # Astro screens
│   └── screens/
│       ├── BaseScreen.ts     # Abstract base class for screens
│       ├── GameScreen.ts     # Main game screen
│       └── LoadingScreen.ts  # Loading progress screen
│
├── scenes/           # ODIE ECS scenes
│   ├── game/
│   │   ├── GameScene.ts      # Main game scene
│   │   ├── components/       # ECS components
│   │   ├── entities/         # ECS entity definitions
│   │   ├── systems/          # ECS systems (game logic)
│   │   └── factories/        # Entity factory functions
│   └── loading/
│       └── LoadingScene.ts   # Loading UI (non-ECS)
│
└── shared/           # Shared utilities
    ├── types/        # Type definitions (Position, Size, GameState)
    ├── utils/        # Utility functions (clamp, lerp)
    ├── ecs/          # ECS helpers (defineComponent)
    └── debug/        # Test harness for E2E testing

assets/               # Static assets (images, audio)
scripts/              # Build and asset processing scripts
tests/                # Unit and integration tests
e2e/                  # Playwright E2E tests
```

## Asset Export from Figma

When exporting assets from Figma, always use **"Layer image size"** (NOT "Original Image size").

This ensures exported dimensions match the design and the manifest width/height values.

## Figma to PixiJS Position Conversion

Figma CSS positions (left, top) specify the **top-left corner** of elements. PixiJS sprites use **center-anchor** (0.5, 0.5) by default.

**When converting Figma positions to PixiJS:**

```
pixiX = figmaLeft + (displayedWidth / 2)
pixiY = figmaTop + (displayedHeight / 2)
```

**Example**: A 56×70px screw at Figma position (229, 493):
- PixiJS center X = 229 + 28 = 257
- PixiJS center Y = 493 + 35 = 528

## Common Commands

```bash
npm run dev            # Start dev server (opens browser)
npm run build          # Production build
npm run test           # Run unit/integration tests
npm run test:e2e       # Run Playwright E2E tests
npm run typecheck      # TypeScript check
npm run lint           # ESLint check
npm run format         # Format with Prettier
npm run validate       # Run all checks (typecheck + lint + format:check + test)
```

## ODIE ECS Patterns

### Creating a Component (Simplified)

Use `defineComponent` helper to reduce boilerplate:

```typescript
import { defineComponent } from '@shared/ecs';

// Creates a fully-typed component class in one line
export const HealthComponent = defineComponent('health', {
  current: 100,
  max: 100,
});
```

### Creating a Component (Traditional)

```typescript
import type { Component } from '@play-co/odie';

interface HealthComponentData {
  current: number;
  max: number;
}

export class HealthComponent implements Component<HealthComponentData> {
  static readonly NAME = 'health';
  current = 100;
  max = 100;

  init(data: HealthComponentData): void {
    this.current = data.current;
    this.max = data.max;
  }
}
```

### Creating an Entity

```typescript
import { DefineEntity, Entity2D } from '@play-co/odie';
import { HealthComponent } from './components';

export const PlayerEntity = DefineEntity(Entity2D, HealthComponent);
```

### Using Entity Factories (Recommended)

```typescript
import { createScrewEntity, createTrayEntity } from '@scenes/game/factories';
import { ScrewColor } from '@shared/types';

// Create a screw entity
const screw = await createScrewEntity({
  color: ScrewColor.Blue,
  position: { x: 100, y: 100 }
});
scene.addChild(screw);

// Create a tray entity
const tray = await createTrayEntity({
  color: ScrewColor.Red,
  position: { x: 48, y: 175 },
  capacity: 3
});
scene.addChild(tray);
```

### Creating a System

Extend `BaseSystem` for convenience methods:

```typescript
import { BaseSystem } from '@scenes/game/systems';
import type { Time } from '@play-co/odie';

export class MovementSystem extends BaseSystem {
  static readonly NAME = 'movement';
  static Queries = {
    movable: { components: [VelocityComponent] }
  };

  update(time: Time): void {
    this.forEachEntity('movable', (entity) => {
      const vel = entity.c.velocity;
      entity.position.x += vel.x * time.deltaTime;
      entity.position.y += vel.y * time.deltaTime;
    });
  }
}

// Register with scene
scene.addSystem(MovementSystem);
```

## Astro Screen Pattern

Extend `BaseScreen` for cleaner lifecycle handling:

```typescript
import { BaseScreen } from '@ui/screens';

class MenuScreen extends BaseScreen {
  protected async onPrepare(): Promise<void> {
    // Called before screen becomes visible
  }

  protected async onShow(): Promise<void> {
    // Called when screen becomes visible
  }

  protected onUpdate(dt: number): void {
    // Called each frame
  }

  protected async onHidden(): Promise<void> {
    // Called when screen is fully hidden - cleanup here
  }
}
```

## Input Handling

### Keyboard Input (KeyboardPlugin)

```typescript
import { KeyboardPlugin } from '@play-co/astro';

const keyboard = app.get(KeyboardPlugin);

// Bind key press
keyboard.bindKeyDown('Space', () => {
  player.jump();
});

// Check if key is down
if (keyboard.isKeyDown('ArrowRight')) {
  player.moveRight();
}
```

### Touch/Pointer Input (TouchInput)

```typescript
import { TouchInput } from '@play-co/astro';
import { Graphics } from 'pixi.js';

// Make a graphics object interactive
const button = new Graphics();
button.rect(0, 0, 100, 50);
button.fill({ color: 0x00ff00 });
button.eventMode = 'static';
button.cursor = 'pointer';

// Attach touch input
const input = new TouchInput(button);
input.onTap = async () => {
  console.log('Button clicked!');
};
```

## Available Astro Plugins

| Plugin | Purpose |
|--------|---------|
| `StagePlugin` | PixiJS renderer and canvas management |
| `ResizePlugin` | Responsive viewport scaling |
| `ResourcePlugin` | Asset loading via PixiJS Assets |
| `KeyboardPlugin` | Keyboard input binding |
| `ScreensPlugin` | Screen management with transitions |
| `SoundPlugin` | Audio management with channels |
| `BusyPlugin` | Loading spinner overlay |
| `VisibilityPlugin` | Pause on tab switch |
| `PreloadPlugin` | Asset preloading with manifest |

## Path Aliases

| Alias | Path |
|-------|------|
| `@app/*` | `src/app/*` |
| `@scenes/*` | `src/scenes/*` |
| `@ui/*` | `src/ui/*` |
| `@shared/*` | `src/shared/*` |

## Test Harness (E2E)

The project includes a test harness for E2E testing accessible via `window.__gameTest`:

```typescript
// In Playwright test
await page.goto('/?testMode');
await page.waitForFunction(() => window.__gameTest?.ready === true);

// Query entities
const entities = await page.evaluate(() =>
  window.__gameTest?.ecs.getEntities()
);

// Execute actions
await page.evaluate(async () => {
  await window.__gameTest?.act({ type: 'pointerDown', x: 100, y: 100 });
  await window.__gameTest?.act({ type: 'pointerUp', x: 100, y: 100 });
});

// Get render signature for visual regression
const signature = await page.evaluate(() =>
  window.__gameTest?.getRenderSignature()
);
```

### Test URL Parameters

| Parameter | Description |
|-----------|-------------|
| `testMode` | Enable test harness |
| `skipIntro` | Skip intro/splash screens |
| `muteAudio` | Disable all audio |
| `seed=<number>` | Set random seed for determinism |
| `scene=<name>` | Skip directly to a specific scene |

## PR Requirements: Screenshots and Videos

**Every PR must include visual documentation** - either screenshots or video GIFs demonstrating the changes.

### Quick Reference

```bash
# Run gameplay demo test (records video)
npm run test:e2e -- --grep "gameplay demo"

# Convert video to GIF
ffmpeg -y -i "e2e/test-results/<test-folder>/video.webm" \
  -vf "fps=12,scale=270:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer" \
  -loop 0 e2e/screenshots/gameplay-demo.gif

# Upload to GitHub release and get URL
gh release create <tag> --title "Demo Assets" e2e/screenshots/gameplay-demo.gif
# Or update existing release:
gh release upload <tag> e2e/screenshots/gameplay-demo.gif --clobber
```

### Recording Video in E2E Tests

Playwright can record video during tests. Create a dedicated demo test:

```typescript
// e2e/specs/gameplay-demo.spec.ts
import { test } from '@playwright/test';

// Enable video with portrait viewport (9:16 aspect ratio)
test.use({
  video: { mode: 'on', size: { width: 360, height: 640 } },
  viewport: { width: 360, height: 640 },
});

test('complete level playthrough for demo video', async ({ page }) => {
  // ... test actions that demonstrate the feature
});
```

Videos are saved to `e2e/test-results/<test-name>/video.webm`.

### Converting Video to GIF

Use ffmpeg to convert .webm to optimized GIF:

```bash
ffmpeg -y -i input.webm \
  -vf "fps=12,scale=270:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer" \
  -loop 0 output.gif
```

Parameters:
- `fps=12` - Frame rate (12 is smooth enough, keeps size small)
- `scale=270:-1` - Width 270px, height auto (maintains aspect ratio)
- `max_colors=128` - Reduce palette for smaller file size
- `dither=bayer` - Better quality dithering

Target GIF size: **under 1MB** for fast loading in PRs.

### Hosting GIFs for PR Inline Display

GitHub PRs can display inline GIFs. Host via GitHub Releases:

```bash
# Create a release with the GIF
gh release create demo-v1.0.0 --title "Demo Assets" gameplay-demo.gif

# Get the download URL
gh release view demo-v1.0.0 --json assets --jq '.assets[0].url'
# Returns: https://github.com/<owner>/<repo>/releases/download/demo-v1.0.0/gameplay-demo.gif
```

### Adding to PR Description

Include the GIF in PR body using markdown:

```markdown
## Demo

![Gameplay Demo](https://github.com/<owner>/<repo>/releases/download/<tag>/gameplay-demo.gif)
```

### PR Body Template

```markdown
## Summary
- Brief description of changes

## Demo

![Feature Demo](https://github.com/.../.gif)

## Test plan
- [ ] Manual testing steps
- [ ] E2E tests pass
```

### Screenshot-Only PRs

For smaller changes, screenshots may suffice:

```typescript
// In E2E test
await page.screenshot({
  path: 'e2e/screenshots/feature-name.png',
  fullPage: false,
});
```

Screenshots in `e2e/screenshots/` can be committed to the repo and referenced directly.

## Notes

- Entry HTML is at `src/index.html`
- Static assets are in `assets/` folder (served at root)
- Strictest TypeScript settings enabled
- ESLint uses type-checked rules
- GameScene implements the main game UI from the Figma design
