/**
 * Unit tests for PartStateSystem.
 *
 * PartStateSystem monitors screw removal events and updates part state.
 * When a part's screwCount reaches 0, it transitions to 'free' state
 * and emits a part:freed event.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import type { Entity, QueryResults } from '@play-co/odie';

import { PartStateSystem } from '@scenes/game/systems/PartStateSystem';
import { gameEvents } from '@scenes/game/utils';
import { ScrewColor } from '@shared/types';

// Helper to create a mock part entity
function createMockPartEntity(
  uid: number,
  screwCount: number,
  state: 'static' | 'constrained' | 'free' = 'static'
): Entity {
  return {
    UID: uid,
    c: {
      part: {
        partDefinitionId: `part-${String(uid)}`,
        layer: 0,
        screwCount,
        state,
      },
    },
  } as unknown as Entity;
}

// Helper to create a mock screw entity
function createMockScrewEntity(
  uid: number,
  partEntityId: string,
  color: ScrewColor = ScrewColor.Red
): Entity {
  return {
    UID: uid,
    c: {
      screw: {
        color,
        state: 'inBoard',
        partEntityId,
        isAnimating: false,
        trayEntityId: '',
        slotIndex: 0,
      },
    },
  } as unknown as Entity;
}

// Helper to create mock query results
function createMockQueryResults(
  parts: Entity[],
  screws: Entity[]
): QueryResults {
  return {
    parts: {
      entities: parts,
      first: parts[0],
      forEach: (callback: (entity: Entity) => void) => {
        parts.forEach(callback);
      },
    },
    screws: {
      entities: screws,
      first: screws[0],
      forEach: (callback: (entity: Entity) => void) => {
        screws.forEach(callback);
      },
    },
  } as unknown as QueryResults;
}

describe('PartStateSystem', () => {
  let system: PartStateSystem;

  beforeEach(() => {
    system = new PartStateSystem();
    gameEvents.clear();
  });

  afterEach(() => {
    gameEvents.clear();
    vi.restoreAllMocks();
  });

  describe('init', () => {
    it('should register screw:removalComplete event listener', () => {
      const onSpy = vi.spyOn(gameEvents, 'on');

      system.init();

      expect(onSpy).toHaveBeenCalledWith(
        'screw:removalComplete',
        expect.any(Function)
      );
    });
  });

  describe('destroy', () => {
    it('should unregister screw:removalComplete event listener', () => {
      const offSpy = vi.spyOn(gameEvents, 'off');

      system.init();
      system.destroy();

      expect(offSpy).toHaveBeenCalledWith(
        'screw:removalComplete',
        expect.any(Function)
      );
    });
  });

  describe('screw removal handling', () => {
    it('should decrement screwCount on screw:removalComplete', () => {
      const partEntity = createMockPartEntity(1, 3);
      const screwEntity = createMockScrewEntity(10, '1');

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        [partEntity],
        [screwEntity]
      );

      system.init();
      gameEvents.emit('screw:removalComplete', { screwEntity });

      const part = (partEntity.c as { part: { screwCount: number } }).part;
      expect(part.screwCount).toBe(2);
    });

    it('should not change state when screwCount > 0 after removal', () => {
      const partEntity = createMockPartEntity(1, 2);
      const screwEntity = createMockScrewEntity(10, '1');

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        [partEntity],
        [screwEntity]
      );

      system.init();
      gameEvents.emit('screw:removalComplete', { screwEntity });

      const part = (partEntity.c as { part: { state: string } }).part;
      expect(part.state).toBe('static');
    });

    it('should transition to free state when screwCount reaches 0', () => {
      const partEntity = createMockPartEntity(1, 1); // Last screw
      const screwEntity = createMockScrewEntity(10, '1');

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        [partEntity],
        [screwEntity]
      );

      system.init();
      gameEvents.emit('screw:removalComplete', { screwEntity });

      const part = (partEntity.c as { part: { state: string } }).part;
      expect(part.state).toBe('free');
    });

    it('should emit part:freed event when screwCount reaches 0', () => {
      const partEntity = createMockPartEntity(1, 1);
      const screwEntity = createMockScrewEntity(10, '1');

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        [partEntity],
        [screwEntity]
      );

      const emitSpy = vi.spyOn(gameEvents, 'emit');

      system.init();
      gameEvents.emit('screw:removalComplete', { screwEntity });

      expect(emitSpy).toHaveBeenCalledWith('part:freed', {
        partEntity,
        partId: 'part-1',
      });
    });

    it('should not emit part:freed when screwCount > 0', () => {
      const partEntity = createMockPartEntity(1, 2);
      const screwEntity = createMockScrewEntity(10, '1');

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        [partEntity],
        [screwEntity]
      );

      const emitSpy = vi.spyOn(gameEvents, 'emit');

      system.init();
      gameEvents.emit('screw:removalComplete', { screwEntity });

      expect(emitSpy).not.toHaveBeenCalledWith('part:freed', expect.anything());
    });

    it('should not emit part:freed if part is already free', () => {
      const partEntity = createMockPartEntity(1, 1, 'free');
      const screwEntity = createMockScrewEntity(10, '1');

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        [partEntity],
        [screwEntity]
      );

      const emitSpy = vi.spyOn(gameEvents, 'emit');

      system.init();
      gameEvents.emit('screw:removalComplete', { screwEntity });

      expect(emitSpy).not.toHaveBeenCalledWith('part:freed', expect.anything());
    });

    it('should handle screw with no partEntityId gracefully', () => {
      const partEntity = createMockPartEntity(1, 2);
      const screwEntity = createMockScrewEntity(10, ''); // No parent part

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        [partEntity],
        [screwEntity]
      );

      system.init();

      // Should not throw
      expect(() => {
        gameEvents.emit('screw:removalComplete', { screwEntity });
      }).not.toThrow();

      // Part should not be modified
      const part = (partEntity.c as { part: { screwCount: number } }).part;
      expect(part.screwCount).toBe(2);
    });

    it('should handle missing part entity gracefully', () => {
      const screwEntity = createMockScrewEntity(10, '999'); // Non-existent part

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        [], // No parts
        [screwEntity]
      );

      system.init();

      // Should not throw
      expect(() => {
        gameEvents.emit('screw:removalComplete', { screwEntity });
      }).not.toThrow();
    });
  });

  describe('update', () => {
    it('should be a no-op (event-driven system)', () => {
      const time = { deltaTime: 16 } as unknown as Parameters<
        typeof system.update
      >[0];

      expect(() => {
        system.update(time);
      }).not.toThrow();
    });
  });
});
