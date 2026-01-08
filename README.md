# Screw Master

A tactile puzzle game about dismantling complex objects by unscrewing bolts in the correct order, managing limited colored trays, and physically interacting with parts to reveal hidden connections.

**Core Fantasy:** *"I am carefully taking apart a real object with my hands."*

**Documentation:**
- [Game Design Document](docs/game-design.md) - Core mechanics and rules
- [Art Direction Guide](docs/art-direction.md) - Visual style for artists
- [Level Design Guide](docs/level-design.md) - Puzzle design for level creators
- [Level Format Spec](docs/level-format.md) - Technical level/region file format

## Tech Stack

Built with PlayCo's internal technology stack: Astro, ODIE, and PixiJS.

- **Node.js** 22+
- **TypeScript** 5.9
- **Vite** 7.2
- **Vitest** for unit/integration testing
- **Playwright** for E2E testing
- **Astro** - Application framework (screens, plugins)
- **ODIE** - ECS game framework
- **PixiJS** v8 - 2D rendering

## Prerequisites

- Node.js 22+
- GitHub token with access to `@play-co` packages

Set your GitHub token:
```bash
export GITHUB_TOKEN=your_token_here
```

## Setup

```bash
npm install
```

## Development

```bash
npm run dev      # Start dev server (opens browser automatically)
npm run build    # Production build
npm run preview  # Preview production build
```

## Testing

```bash
npm run test         # Run unit/integration tests
npm run test:watch   # Watch mode
npm run test:ui      # Vitest UI

npm run test:e2e     # Run Playwright E2E tests
npm run test:e2e:ui  # Playwright UI mode
```

## Code Quality

```bash
npm run typecheck    # TypeScript validation
npm run lint         # ESLint check
npm run lint:fix     # ESLint auto-fix
npm run format       # Format with Prettier
npm run format:check # Check formatting
npm run validate     # Run all checks (typecheck + lint + format + test)
```

## Architecture

```
Astro Application
    ├── StagePlugin (PixiJS renderer)
    ├── ResizePlugin (viewport scaling)
    ├── ResourcePlugin (asset loading)
    ├── KeyboardPlugin (input handling)
    └── ScreensPlugin
            └── GameScreen (Astro Screen)
                    └── GameScene (ODIE Scene2D)
                            ├── Systems (game logic)
                            └── Entities (game objects)
                                    └── Components (data)
```

- **Astro** manages the application lifecycle, plugins, and screen navigation
- **ODIE Scene2D** is embedded in Astro screens for ECS-based game logic
- **PixiJS** handles all 2D rendering via Astro's StagePlugin

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
tests/                # Unit and integration tests
e2e/                  # Playwright E2E tests
```

## Key Patterns

### Creating Components

Use the `defineComponent` helper to reduce boilerplate:

```typescript
import { defineComponent } from '@shared/ecs';

export const HealthComponent = defineComponent('health', {
  current: 100,
  max: 100,
});
```

Or the traditional class-based approach:

```typescript
import type { Component } from '@play-co/odie';

export class HealthComponent implements Component<HealthData> {
  static readonly NAME = 'health';
  current = 100;
  max = 100;

  init(data: HealthData): void {
    this.current = data.current;
    this.max = data.max;
  }
}
```

### Creating Entities

Use factory functions for cleaner entity creation:

```typescript
import { createSquareEntity } from '@scenes/game/factories';

const square = createSquareEntity({
  size: 100,
  color: 0xff0000,
  position: { x: 100, y: 100 }
});
scene.addChild(square);
```

### Creating Systems

Extend `BaseSystem` for game logic:

```typescript
import { BaseSystem } from '@scenes/game/systems';

export class MovementSystem extends BaseSystem {
  static readonly NAME = 'movement';
  static Queries = {
    movable: { components: [VelocityComponent] }
  };

  update(time: Time): void {
    this.forEachEntity('movable', (entity) => {
      entity.position.x += entity.c.velocity.x * time.deltaTime;
    });
  }
}
```

### Creating Screens

Extend `BaseScreen` for cleaner lifecycle handling:

```typescript
import { BaseScreen } from '@ui/screens';

class MenuScreen extends BaseScreen {
  protected async onPrepare(): Promise<void> {
    // Initialize UI
  }

  protected async onShow(): Promise<void> {
    // Start animations
  }

  protected async onHidden(): Promise<void> {
    // Cleanup
  }
}
```

### Input Handling

Use Astro's built-in input plugins:

```typescript
// Keyboard input (via KeyboardPlugin)
import { KeyboardPlugin } from '@play-co/astro';

const keyboard = app.get(KeyboardPlugin);
keyboard.bindKeyDown('Space', () => {
  player.jump();
});

// Touch/pointer input (via TouchInput)
import { TouchInput } from '@play-co/astro';

const input = new TouchInput(graphics);
input.onTap = async () => {
  // Handle tap
};
```

## Astro Plugins

The application uses these Astro plugins:

| Plugin | Purpose |
|--------|---------|
| `StagePlugin` | PixiJS renderer and canvas management |
| `ResizePlugin` | Responsive viewport scaling |
| `ResourcePlugin` | Asset loading via PixiJS Assets |
| `KeyboardPlugin` | Keyboard input binding |
| `ScreensPlugin` | Screen management with transitions |

Additional plugins available:
- `SoundPlugin` - Audio management
- `BusyPlugin` - Loading spinner overlay
- `VisibilityPlugin` - Pause on tab switch
- `PreloadPlugin` - Asset preloading with manifest

## E2E Testing

The game includes a test harness for E2E testing with Playwright:

```typescript
// In Playwright test
test('game loads correctly', async ({ page }) => {
  await page.goto('/?testMode');

  // Wait for game to be ready
  await page.waitForFunction(() => window.__gameTest?.ready === true);

  // Verify no errors
  const errors = await page.evaluate(() => window.__gameTest?.errors);
  expect(errors).toHaveLength(0);

  // Query entities
  const entities = await page.evaluate(() =>
    window.__gameTest?.ecs.getEntities()
  );
  expect(entities?.length).toBeGreaterThan(0);
});
```

Test URL parameters:
- `testMode` - Enable test harness
- `skipIntro` - Skip intro screens
- `muteAudio` - Disable audio
- `seed=<number>` - Set random seed
- `scene=<name>` - Skip to specific scene

## License

MIT
