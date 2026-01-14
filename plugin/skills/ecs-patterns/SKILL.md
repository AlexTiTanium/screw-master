---
name: ECS Patterns
description: This skill should be used when the user asks to "create a system", "add a component", "create an entity", "use BaseSystem", "define component", "entity factory", or works with ODIE ECS architecture in the Screw Master codebase.
version: 1.0.0
---

# ODIE ECS Patterns for Screw Master

This skill provides guidance for working with the ODIE Entity-Component-System architecture used in Screw Master.

## Core Concepts

### ECS Architecture Overview

```
GameScene (ODIE Scene2D)
├── Systems (game logic)
├── Entities (game objects)
│   └── Components (data)
└── Event Bus (communication)
```

- **Entities**: Game objects (screws, trays, parts)
- **Components**: Data containers attached to entities
- **Systems**: Logic that operates on entities with specific components

## Creating Components

### Recommended: defineComponent Helper

Use the `defineComponent` helper from `@shared/ecs` for minimal boilerplate:

```typescript
import { defineComponent } from '@shared/ecs';

export const HealthComponent = defineComponent('health', {
  current: 100,
  max: 100,
});
```

### Traditional Approach

For more control, implement the `Component<T>` interface:

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

## Creating Systems

### Extend BaseSystem

Always extend `BaseSystem` for convenience methods:

```typescript
import { BaseSystem } from '@scenes/game/systems';
import type { Time } from '@play-co/odie';

export class MovementSystem extends BaseSystem {
  static readonly NAME = 'movement';
  static Queries = {
    movable: { components: [VelocityComponent] }
  };

  init(): void {
    // Subscribe to events
    gameEvents.on<MoveEvent>('entity:move', this.handleMove);
  }

  destroy(): void {
    // Unsubscribe from events
    gameEvents.off<MoveEvent>('entity:move', this.handleMove);
  }

  update(time: Time): void {
    this.forEachEntity('movable', (entity) => {
      const vel = this.getComponents<VelocityAccess>(entity).velocity;
      entity.position.x += vel.x * time.deltaTime;
    });
  }

  private handleMove = (event: MoveEvent): void => {
    // Handle event
  };
}
```

### BaseSystem Helpers

- `forEachEntity(queryName, callback)` - Safe iteration over query results
- `getComponents<T>(entity)` - Type-safe component access
- `getFirstEntity()` - Get first entity from query
- `getEntities()` - Get all entities from query
- `getEntityCount()` - Count entities in query

## Creating Entities

### Using DefineEntity

```typescript
import { DefineEntity, Entity2D } from '@play-co/odie';
import { HealthComponent, PositionComponent } from './components';

export const PlayerEntity = DefineEntity(Entity2D, HealthComponent, PositionComponent);
```

### Using Entity Factories (Recommended)

Create factory functions for consistent entity creation:

```typescript
import { createScrewEntity, createTrayEntity } from '@scenes/game/factories';
import { ScrewColor } from '@shared/types';

// Create a screw
const screw = await createScrewEntity({
  color: ScrewColor.Blue,
  position: { x: 100, y: 100 }
});
scene.addChild(screw);

// Create a tray
const tray = await createTrayEntity({
  color: ScrewColor.Red,
  position: { x: 48, y: 175 },
  capacity: 3
});
scene.addChild(tray);
```

## Type-Safe Component Access

Define component access interfaces:

```typescript
// In types/component-access.ts
export interface ScrewComponentAccess {
  screw: {
    color: ScrewColor;
    state: ScrewState;
    isAnimating: boolean;
  };
}

// In system
const screw = this.getComponents<ScrewComponentAccess>(entity).screw;
screw.isAnimating = true; // Fully typed!
```

## System Lifecycle

```
1. constructor() - System instantiated
2. init() - Subscribe to events, setup dependencies
3. update(time) - Called each frame
4. destroy() - Unsubscribe from events, cleanup
```

## Registration Order

Systems must be registered in dependency order in `GameScene.ts`:

```
1. TickSystem (must be first)
2. ScrewPlacementSystem
3. AnimationSystem
4. ScrewInteractionSystem
5. AutoTransferSystem
6. WinConditionSystem
7. TrayManagementSystem
```

## Reference Files

For detailed patterns and existing implementations:
- Systems: `src/scenes/game/systems/`
- Components: `src/scenes/game/components/`
- Factories: `src/scenes/game/factories/`
- Type definitions: `src/scenes/game/types/`
- Architecture docs: `docs/game-architecture.md`
