---
name: Game Events
description: This skill should be used when the user asks about "game events", "GameEventBus", "event flow", "emit event", "subscribe to event", "event-driven architecture", or works with inter-system communication in Screw Master.
version: 1.0.0
---

# Game Events in Screw Master

This skill provides guidance for working with the event-driven architecture in Screw Master using GameEventBus.

## Core Principle

Systems communicate via events, NOT direct method calls. This keeps systems decoupled and testable.

```typescript
// WRONG - direct coupling
const otherSystem = this.scene.getSystem(OtherSystem);
otherSystem.doSomething(); // Creates tight coupling

// RIGHT - event-driven
gameEvents.emit('action:requested', { data });
// OtherSystem subscribes and handles independently
```

## Event Bus API

### Subscribing to Events

```typescript
import { gameEvents } from '@scenes/game/utils/GameEventBus';

// In system init()
init(): void {
  gameEvents.on<EventPayload>('event:name', this.handleEvent);
}

// Handler must be bound (arrow function or .bind)
private handleEvent = (payload: EventPayload): void => {
  // Handle event
};
```

### Unsubscribing from Events

```typescript
// In system destroy() - CRITICAL for cleanup
destroy(): void {
  gameEvents.off<EventPayload>('event:name', this.handleEvent);
}
```

### Emitting Events

```typescript
gameEvents.emit('event:name', {
  entityId: entity.uid,
  data: someData
});
```

## Event Naming Convention

Format: `domain:action`

- `screw:startRemoval` - Screw removal started
- `screw:removalComplete` - Screw removal finished
- `tray:startHide` - Tray hide animation started
- `game:won` - Player won the level

## Core Event Chains

### Screw Removal Flow

```
User taps screw
  → ScrewInteractionSystem emits screw:startRemoval
    → AnimationSystem animates removal
      → AnimationSystem emits screw:removalComplete
        → TrayManagementSystem updates tray state
        → AutoTransferSystem checks for transfers
        → WinConditionSystem checks win/stuck
```

### Tray Transition Flow

```
Tray becomes full
  → TrayManagementSystem emits tray:startHide
    → AnimationSystem animates hide
      → AnimationSystem emits tray:hideComplete
        → TrayManagementSystem emits tray:startShift
          → AnimationSystem animates shift
            → AnimationSystem emits tray:shiftComplete
              → TrayManagementSystem emits tray:startReveal
                → AnimationSystem animates reveal
                  → AnimationSystem emits tray:revealComplete
```

## Event Payload Types

Define typed payloads for type safety:

```typescript
// In types/events.ts
export interface ScrewRemovalEvent {
  entityId: number;
  targetTrayId: number;
  slotIndex: number;
}

export interface TrayTransitionEvent {
  trayEntityId: number;
  direction: 'up' | 'down';
}

export interface GameEndEvent {
  reason: 'won' | 'stuck';
}
```

## Complete Event Reference

### Screw Events

| Event | Payload | Emitter | Subscribers |
|-------|---------|---------|-------------|
| `screw:startRemoval` | `{ entityId, targetTrayId, slotIndex }` | ScrewInteractionSystem | AnimationSystem |
| `screw:removalComplete` | `{ entityId, targetTrayId, slotIndex }` | AnimationSystem | TrayManagement, AutoTransfer, WinCondition |
| `screw:startTransfer` | `{ entityId, fromTrayId, toTrayId, toSlot }` | AutoTransferSystem | AnimationSystem |
| `screw:transferComplete` | `{ entityId, toTrayId, toSlot }` | AnimationSystem | TrayManagement, WinCondition |

### Tray Events

| Event | Payload | Emitter | Subscribers |
|-------|---------|---------|-------------|
| `tray:startHide` | `{ trayEntityId }` | TrayManagementSystem | AnimationSystem |
| `tray:hideComplete` | `{ trayEntityId }` | AnimationSystem | TrayManagementSystem |
| `tray:startShift` | `{ direction }` | TrayManagementSystem | AnimationSystem |
| `tray:shiftComplete` | `{}` | AnimationSystem | TrayManagementSystem |
| `tray:startReveal` | `{ trayEntityId }` | TrayManagementSystem | AnimationSystem |
| `tray:revealComplete` | `{ trayEntityId }` | AnimationSystem | TrayManagementSystem |

### Game Events

| Event | Payload | Emitter | Subscribers |
|-------|---------|---------|-------------|
| `game:won` | `{}` | WinConditionSystem | GameScene (UI) |
| `game:stuck` | `{}` | WinConditionSystem | GameScene (UI) |

## Best Practices

### Handler Binding

Always bind handlers to preserve `this` context:

```typescript
// Option 1: Arrow function property (recommended)
private handleEvent = (payload: EventPayload): void => {
  this.doSomething(); // 'this' is correct
};

// Option 2: Bind in constructor
constructor() {
  this.handleEvent = this.handleEvent.bind(this);
}
```

### Event Guards

Check animation state before processing:

```typescript
private handleRemovalComplete = (event: ScrewRemovalEvent): void => {
  const entity = this.getEntityById(event.entityId);
  if (!entity || entity.c.screw.isAnimating) return;

  // Safe to process
};
```

### Async Event Handling

For async operations, use promises carefully:

```typescript
private handleEvent = async (payload: EventPayload): Promise<void> => {
  // Mark as animating to block other events
  entity.c.screw.isAnimating = true;

  try {
    await this.doAsyncWork();
  } finally {
    entity.c.screw.isAnimating = false;
  }
};
```

## Reference Files

- Event bus implementation: `src/scenes/game/utils/GameEventBus.ts`
- Event types: `src/scenes/game/types/events.ts`
- Systems with event handling: `src/scenes/game/systems/`
- Architecture docs: `docs/game-architecture.md`
