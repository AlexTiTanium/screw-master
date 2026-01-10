import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import type { Entity, QueryResults } from '@play-co/odie';

import { TrayManagementSystem } from '@scenes/game/systems/TrayManagementSystem';
import { gameEvents } from '@scenes/game/utils';
import { ScrewColor } from '@shared/types';

// Helper to create a mock tray entity
function createMockTrayEntity(
  uid: number,
  color: ScrewColor,
  capacity: number,
  screwCount: number,
  displayOrder: number,
  isAnimating = false
): Entity {
  return {
    UID: uid,
    c: {
      tray: {
        color,
        capacity,
        screwCount,
        displayOrder,
        isAnimating,
      },
    },
  } as unknown as Entity;
}

// Helper to create a mock screw entity with tray info
function createMockScrewEntity(
  uid: number,
  color: ScrewColor,
  state: string,
  trayEntityId = ''
): Entity {
  return {
    UID: uid,
    c: {
      screw: {
        color,
        state,
        isAnimating: false,
        trayEntityId,
        slotIndex: 0,
      },
    },
  } as unknown as Entity;
}

// Helper to create mock query results
function createMockQueryResults(trays: Entity[]): QueryResults {
  return {
    trays: {
      entities: trays,
      first: trays[0],
      forEach: (callback: (entity: Entity) => void) => {
        trays.forEach(callback);
      },
    },
  } as unknown as QueryResults;
}

describe('TrayManagementSystem', () => {
  let system: TrayManagementSystem;

  beforeEach(() => {
    system = new TrayManagementSystem();
    gameEvents.clear();
  });

  afterEach(() => {
    gameEvents.clear();
    vi.restoreAllMocks();
  });

  /* eslint-disable @typescript-eslint/dot-notation */

  describe('init', () => {
    it('should register event listeners', () => {
      const onSpy = vi.spyOn(gameEvents, 'on');

      system.init();

      expect(onSpy).toHaveBeenCalledWith(
        'screw:removalComplete',
        expect.any(Function)
      );
      expect(onSpy).toHaveBeenCalledWith(
        'tray:hideComplete',
        expect.any(Function)
      );
      expect(onSpy).toHaveBeenCalledWith(
        'tray:shiftComplete',
        expect.any(Function)
      );
      expect(onSpy).toHaveBeenCalledWith(
        'tray:revealComplete',
        expect.any(Function)
      );
    });
  });

  describe('destroy', () => {
    it('should unregister event listeners', () => {
      const offSpy = vi.spyOn(gameEvents, 'off');

      system.init();
      system.destroy();

      expect(offSpy).toHaveBeenCalledWith(
        'screw:removalComplete',
        expect.any(Function)
      );
    });

    it('should clear transition queue', () => {
      system.init();
      // Access private property for testing
      (system as unknown as { transitionQueue: Entity[] }).transitionQueue = [
        createMockTrayEntity(1, ScrewColor.Red, 3, 3, 0),
      ];

      system.destroy();

      expect(
        (system as unknown as { transitionQueue: Entity[] }).transitionQueue
      ).toHaveLength(0);
    });

    it('should reset transitioning flag', () => {
      system.init();
      (system as unknown as { isTransitioning: boolean }).isTransitioning =
        true;

      system.destroy();

      expect(
        (system as unknown as { isTransitioning: boolean }).isTransitioning
      ).toBe(false);
    });
  });

  describe('handleScrewRemovalComplete', () => {
    it('should queue transition when tray becomes full', async () => {
      const fullTray = createMockTrayEntity(1, ScrewColor.Red, 3, 3, 0);
      const screw = createMockScrewEntity(10, ScrewColor.Red, 'inTray', '1');

      (system as { queries: QueryResults }).queries = createMockQueryResults([
        fullTray,
      ]);

      system.init();

      // Trigger the event
      gameEvents.emit('screw:removalComplete', { screwEntity: screw });

      // Allow async queue processing to start
      await vi.waitFor(
        () => {
          // The tray should be in queue or already processing (isTransitioning)
          const queue = (system as unknown as { transitionQueue: Entity[] })
            .transitionQueue;
          const isTransitioning = (
            system as unknown as { isTransitioning: boolean }
          ).isTransitioning;
          return queue.length > 0 || isTransitioning;
        },
        { timeout: 100 }
      );
    });

    it('should not queue if tray is not full', () => {
      const partialTray = createMockTrayEntity(1, ScrewColor.Red, 3, 2, 0);
      const screw = createMockScrewEntity(10, ScrewColor.Red, 'inTray', '1');

      (system as { queries: QueryResults }).queries = createMockQueryResults([
        partialTray,
      ]);

      system.init();

      gameEvents.emit('screw:removalComplete', { screwEntity: screw });

      expect(
        (system as unknown as { transitionQueue: Entity[] }).transitionQueue
      ).toHaveLength(0);
      expect(
        (system as unknown as { isTransitioning: boolean }).isTransitioning
      ).toBe(false);
    });

    it('should ignore screws not in tray state', () => {
      const fullTray = createMockTrayEntity(1, ScrewColor.Red, 3, 3, 0);
      const screw = createMockScrewEntity(10, ScrewColor.Red, 'inBuffer', '1');

      (system as { queries: QueryResults }).queries = createMockQueryResults([
        fullTray,
      ]);

      system.init();

      gameEvents.emit('screw:removalComplete', { screwEntity: screw });

      expect(
        (system as unknown as { transitionQueue: Entity[] }).transitionQueue
      ).toHaveLength(0);
      expect(
        (system as unknown as { isTransitioning: boolean }).isTransitioning
      ).toBe(false);
    });

    it('should not queue duplicate trays', () => {
      const fullTray = createMockTrayEntity(1, ScrewColor.Red, 3, 3, 0);
      const screw1 = createMockScrewEntity(10, ScrewColor.Red, 'inTray', '1');
      const screw2 = createMockScrewEntity(11, ScrewColor.Red, 'inTray', '1');

      (system as { queries: QueryResults }).queries = createMockQueryResults([
        fullTray,
      ]);

      // Prevent auto-processing by setting isTransitioning
      (system as unknown as { isTransitioning: boolean }).isTransitioning =
        true;

      system.init();

      gameEvents.emit('screw:removalComplete', { screwEntity: screw1 });
      gameEvents.emit('screw:removalComplete', { screwEntity: screw2 });

      // Since isTransitioning is true, it should only queue once
      expect(
        (system as unknown as { transitionQueue: Entity[] }).transitionQueue
      ).toHaveLength(1);
    });
  });

  describe('processNextTransition', () => {
    it('should emit tray:startHide event', async () => {
      const fullTray = createMockTrayEntity(1, ScrewColor.Red, 3, 3, 0);

      (system as { queries: QueryResults }).queries = createMockQueryResults([
        fullTray,
      ]);

      const emitSpy = vi.spyOn(gameEvents, 'emit');

      // Queue the transition
      (system as unknown as { transitionQueue: Entity[] }).transitionQueue = [
        fullTray,
      ];

      // Start processing (but don't await - it waits for events)
      const processPromise = system['processNextTransition']();

      // Verify hide event was emitted
      expect(emitSpy).toHaveBeenCalledWith(
        'tray:startHide',
        expect.objectContaining({ trayEntity: fullTray })
      );

      // Complete the animation to allow the promise to resolve
      gameEvents.emit('tray:hideComplete', {});
      await processPromise;
    });

    it('should not process if already transitioning', async () => {
      const fullTray = createMockTrayEntity(1, ScrewColor.Red, 3, 3, 0);

      (system as { queries: QueryResults }).queries = createMockQueryResults([
        fullTray,
      ]);
      (system as unknown as { isTransitioning: boolean }).isTransitioning =
        true;
      (system as unknown as { transitionQueue: Entity[] }).transitionQueue = [
        fullTray,
      ];

      const emitSpy = vi.spyOn(gameEvents, 'emit');

      await system['processNextTransition']();

      expect(emitSpy).not.toHaveBeenCalledWith(
        'tray:startHide',
        expect.anything()
      );
    });

    it('should not process if queue is empty', async () => {
      (system as { queries: QueryResults }).queries = createMockQueryResults(
        []
      );
      (system as unknown as { transitionQueue: Entity[] }).transitionQueue = [];

      const emitSpy = vi.spyOn(gameEvents, 'emit');

      await system['processNextTransition']();

      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('should mark full tray as animating', async () => {
      const fullTray = createMockTrayEntity(1, ScrewColor.Red, 3, 3, 0);

      (system as { queries: QueryResults }).queries = createMockQueryResults([
        fullTray,
      ]);
      (system as unknown as { transitionQueue: Entity[] }).transitionQueue = [
        fullTray,
      ];

      const processPromise = system['processNextTransition']();

      const trayComponent = (fullTray.c as { tray: { isAnimating: boolean } })
        .tray;
      expect(trayComponent.isAnimating).toBe(true);

      // Complete the animation
      gameEvents.emit('tray:hideComplete', {});
      await processPromise;
    });

    it('should emit tray:revealed after reveal completes', async () => {
      const fullTray = createMockTrayEntity(1, ScrewColor.Red, 3, 3, 0);
      const hiddenTray = createMockTrayEntity(2, ScrewColor.Blue, 3, 0, 2);

      (system as { queries: QueryResults }).queries = createMockQueryResults([
        fullTray,
        hiddenTray,
      ]);
      (system as unknown as { transitionQueue: Entity[] }).transitionQueue = [
        fullTray,
      ];

      const emitSpy = vi.spyOn(gameEvents, 'emit');

      const processPromise = system['processNextTransition']();

      // Wait for hide event to be emitted, then complete it
      await vi.waitFor(
        () => {
          expect(emitSpy).toHaveBeenCalledWith(
            'tray:startHide',
            expect.anything()
          );
        },
        { timeout: 100 }
      );
      gameEvents.emit('tray:hideComplete', {});

      // Wait for reveal event to be emitted, then complete it
      await vi.waitFor(
        () => {
          expect(emitSpy).toHaveBeenCalledWith(
            'tray:startReveal',
            expect.anything()
          );
        },
        { timeout: 100 }
      );
      gameEvents.emit('tray:revealComplete', {});

      await processPromise;

      expect(emitSpy).toHaveBeenCalledWith(
        'tray:revealed',
        expect.objectContaining({ trayEntity: hiddenTray })
      );
    });

    it('should update displayOrder of hidden tray to 1 after reveal', async () => {
      const fullTray = createMockTrayEntity(1, ScrewColor.Red, 3, 3, 0);
      const hiddenTray = createMockTrayEntity(2, ScrewColor.Blue, 3, 0, 2);

      (system as { queries: QueryResults }).queries = createMockQueryResults([
        fullTray,
        hiddenTray,
      ]);
      (system as unknown as { transitionQueue: Entity[] }).transitionQueue = [
        fullTray,
      ];

      const emitSpy = vi.spyOn(gameEvents, 'emit');

      const processPromise = system['processNextTransition']();

      // Wait for hide event to be emitted, then complete it
      await vi.waitFor(
        () => {
          expect(emitSpy).toHaveBeenCalledWith(
            'tray:startHide',
            expect.anything()
          );
        },
        { timeout: 100 }
      );
      gameEvents.emit('tray:hideComplete', {});

      // Wait for reveal event to be emitted, then complete it
      await vi.waitFor(
        () => {
          expect(emitSpy).toHaveBeenCalledWith(
            'tray:startReveal',
            expect.anything()
          );
        },
        { timeout: 100 }
      );
      gameEvents.emit('tray:revealComplete', {});

      await processPromise;

      const hiddenTrayComponent = (
        hiddenTray.c as { tray: { displayOrder: number } }
      ).tray;
      expect(hiddenTrayComponent.displayOrder).toBe(1);
    });

    it('should set full tray displayOrder to 99', async () => {
      const fullTray = createMockTrayEntity(1, ScrewColor.Red, 3, 3, 0);

      (system as { queries: QueryResults }).queries = createMockQueryResults([
        fullTray,
      ]);
      (system as unknown as { transitionQueue: Entity[] }).transitionQueue = [
        fullTray,
      ];

      const processPromise = system['processNextTransition']();

      gameEvents.emit('tray:hideComplete', {});

      await processPromise;

      const trayComponent = (fullTray.c as { tray: { displayOrder: number } })
        .tray;
      expect(trayComponent.displayOrder).toBe(99);
    });
  });

  describe('update', () => {
    it('should be a no-op', () => {
      const time = { deltaTime: 16 } as unknown as Parameters<
        typeof system.update
      >[0];

      expect(() => {
        system.update(time);
      }).not.toThrow();
    });
  });
});
