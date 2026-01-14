import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import type { Entity, QueryResults } from '@play-co/odie';

import { WinConditionSystem } from '@scenes/game/systems/WinConditionSystem';
import { gameEvents } from '@scenes/game/utils';
import { ScrewColor } from '@shared/types';

// Helper to create a mock screw entity
function createMockScrewEntity(
  uid: number,
  color: ScrewColor,
  state: 'inBoard' | 'inTray' | 'inBuffer' | 'dragging',
  isAnimating = false
): Entity {
  return {
    UID: uid,
    c: {
      screw: {
        color,
        state,
        isAnimating,
        trayEntityId: '',
        slotIndex: 0,
      },
    },
  } as unknown as Entity;
}

// Helper to create a mock tray entity
function createMockTrayEntity(
  uid: number,
  color: ScrewColor,
  isAnimating = false
): Entity {
  return {
    UID: uid,
    c: {
      tray: {
        color,
        isAnimating,
        capacity: 3,
        screwIds: [],
      },
    },
  } as unknown as Entity;
}

// Helper to create a mock game state entity
function createMockGameStateEntity(
  phase: 'playing' | 'won' | 'stuck' = 'playing',
  winConditionType = 'allScrewsRemoved',
  removedScrews = 0
): Entity {
  return {
    UID: 999,
    c: {
      gameState: {
        phase,
        winConditionType,
        removedScrews,
        totalScrews: 3,
      },
    },
  } as unknown as Entity;
}

// Helper to create mock query results
function createMockQueryResults(
  screws: Entity[],
  gameState: Entity | null,
  trays: Entity[] = []
): QueryResults {
  const gameStateEntities = gameState ? [gameState] : [];
  return {
    screws: {
      entities: screws,
      first: screws[0],
      forEach: (callback: (entity: Entity) => void) => {
        screws.forEach(callback);
      },
    },
    gameState: {
      entities: gameStateEntities,
      first: gameState,
      forEach: (callback: (entity: Entity) => void) => {
        gameStateEntities.forEach(callback);
      },
    },
    trays: {
      entities: trays,
      first: trays[0],
      forEach: (callback: (entity: Entity) => void) => {
        trays.forEach(callback);
      },
    },
  } as unknown as QueryResults;
}

describe('WinConditionSystem', () => {
  let system: WinConditionSystem;
  let mockPlacementSystem: { hasValidMoves: ReturnType<typeof vi.fn> };
  let mockTrayManagementSystem: { isBusy: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    system = new WinConditionSystem();
    mockPlacementSystem = {
      hasValidMoves: vi.fn().mockReturnValue(true),
    };
    mockTrayManagementSystem = {
      isBusy: vi.fn().mockReturnValue(false),
    };

    // Mock scene.getSystem to return the appropriate mock
    (
      system as unknown as { scene: { getSystem: (type: unknown) => unknown } }
    ).scene = {
      getSystem: (type: unknown): unknown => {
        // Return TrayManagementSystem mock when requested
        if ((type as { NAME?: string }).NAME === 'trayManagement') {
          return mockTrayManagementSystem;
        }
        return mockPlacementSystem;
      },
    };

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
        'screw:transferComplete',
        expect.any(Function)
      );
    });
  });

  describe('checkConditions (via screw:removalComplete)', () => {
    it('should increment removedScrews on screw removal', () => {
      const gameState = createMockGameStateEntity('playing');
      const screws = [
        createMockScrewEntity(1, ScrewColor.Red, 'inTray'),
        createMockScrewEntity(2, ScrewColor.Blue, 'inBoard'),
      ];

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        screws,
        gameState
      );

      system.init();
      gameEvents.emit('screw:removalComplete', {});

      const state = (gameState.c as { gameState: { removedScrews: number } })
        .gameState;
      expect(state.removedScrews).toBe(1);
    });

    it('should skip if no game state entity', () => {
      const screws = [createMockScrewEntity(1, ScrewColor.Red, 'inBoard')];

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        screws,
        null
      );

      system.init();

      // Should not throw
      expect(() => {
        gameEvents.emit('screw:removalComplete', {});
      }).not.toThrow();
    });

    it('should skip if game phase is not playing', () => {
      const gameState = createMockGameStateEntity('won');
      const screws = [createMockScrewEntity(1, ScrewColor.Red, 'inBoard')];

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        screws,
        gameState
      );

      system.init();
      gameEvents.emit('screw:removalComplete', {});

      // removedScrews should not change
      const state = (gameState.c as { gameState: { removedScrews: number } })
        .gameState;
      expect(state.removedScrews).toBe(0);
    });
  });

  describe('win condition detection', () => {
    it('should emit game:won when all screws are removed', () => {
      const gameState = createMockGameStateEntity('playing');
      // All screws in tray (none in board)
      const screws = [
        createMockScrewEntity(1, ScrewColor.Red, 'inTray'),
        createMockScrewEntity(2, ScrewColor.Blue, 'inTray'),
      ];

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        screws,
        gameState
      );

      const emitSpy = vi.spyOn(gameEvents, 'emit');

      system.init();
      gameEvents.emit('screw:removalComplete', {});

      expect(emitSpy).toHaveBeenCalledWith('game:won');
    });

    it('should set phase to won when win condition is met', () => {
      const gameState = createMockGameStateEntity('playing');
      const screws = [createMockScrewEntity(1, ScrewColor.Red, 'inTray')];

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        screws,
        gameState
      );

      system.init();
      gameEvents.emit('screw:removalComplete', {});

      const state = (gameState.c as { gameState: { phase: string } }).gameState;
      expect(state.phase).toBe('won');
    });

    it('should not emit game:won when screws remain in board', () => {
      const gameState = createMockGameStateEntity('playing');
      const screws = [
        createMockScrewEntity(1, ScrewColor.Red, 'inTray'),
        createMockScrewEntity(2, ScrewColor.Blue, 'inBoard'),
      ];

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        screws,
        gameState
      );

      const emitSpy = vi.spyOn(gameEvents, 'emit');

      system.init();
      gameEvents.emit('screw:removalComplete', {});

      expect(emitSpy).not.toHaveBeenCalledWith('game:won');
    });

    it('should not emit game:won when screws remain in buffer', () => {
      const gameState = createMockGameStateEntity('playing');
      // No screws in board, but one screw still in buffer waiting to be transferred
      const screws = [
        createMockScrewEntity(1, ScrewColor.Red, 'inTray'),
        createMockScrewEntity(2, ScrewColor.Blue, 'inTray'),
        createMockScrewEntity(3, ScrewColor.Yellow, 'inBuffer'),
      ];

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        screws,
        gameState
      );

      const emitSpy = vi.spyOn(gameEvents, 'emit');

      system.init();
      gameEvents.emit('screw:removalComplete', {});

      // Should NOT win because there's still a screw in the buffer
      expect(emitSpy).not.toHaveBeenCalledWith('game:won');
      const state = (gameState.c as { gameState: { phase: string } }).gameState;
      expect(state.phase).toBe('playing');
    });

    it('should handle default win condition type', () => {
      const gameState = createMockGameStateEntity('playing', 'unknownType');
      const screws: Entity[] = []; // No screws - all removed

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        screws,
        gameState
      );

      const emitSpy = vi.spyOn(gameEvents, 'emit');

      system.init();
      gameEvents.emit('screw:removalComplete', {});

      // Should fall back to allScrewsRemoved check
      expect(emitSpy).toHaveBeenCalledWith('game:won');
    });
  });

  describe('stuck condition detection', () => {
    it('should emit game:stuck when no valid moves and screws remain', () => {
      const gameState = createMockGameStateEntity('playing');
      const screws = [
        createMockScrewEntity(1, ScrewColor.Red, 'inBoard'),
        createMockScrewEntity(2, ScrewColor.Blue, 'inBoard'),
      ];

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        screws,
        gameState
      );

      mockPlacementSystem.hasValidMoves.mockReturnValue(false);

      const emitSpy = vi.spyOn(gameEvents, 'emit');

      system.init();
      gameEvents.emit('screw:removalComplete', {});

      expect(emitSpy).toHaveBeenCalledWith('game:stuck');
    });

    it('should set phase to stuck when stuck condition is met', () => {
      const gameState = createMockGameStateEntity('playing');
      const screws = [createMockScrewEntity(1, ScrewColor.Red, 'inBoard')];

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        screws,
        gameState
      );

      mockPlacementSystem.hasValidMoves.mockReturnValue(false);

      system.init();
      gameEvents.emit('screw:removalComplete', {});

      const state = (gameState.c as { gameState: { phase: string } }).gameState;
      expect(state.phase).toBe('stuck');
    });

    it('should not emit game:stuck when valid moves exist', () => {
      const gameState = createMockGameStateEntity('playing');
      const screws = [createMockScrewEntity(1, ScrewColor.Red, 'inBoard')];

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        screws,
        gameState
      );

      mockPlacementSystem.hasValidMoves.mockReturnValue(true);

      const emitSpy = vi.spyOn(gameEvents, 'emit');

      system.init();
      gameEvents.emit('screw:removalComplete', {});

      expect(emitSpy).not.toHaveBeenCalledWith('game:stuck');
    });

    it('should not emit game:stuck when no screws remain (win takes priority)', () => {
      const gameState = createMockGameStateEntity('playing');
      const screws: Entity[] = []; // All screws removed

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        screws,
        gameState
      );

      mockPlacementSystem.hasValidMoves.mockReturnValue(false);

      const emitSpy = vi.spyOn(gameEvents, 'emit');

      system.init();
      gameEvents.emit('screw:removalComplete', {});

      // Should emit won, not stuck
      expect(emitSpy).toHaveBeenCalledWith('game:won');
      expect(emitSpy).not.toHaveBeenCalledWith('game:stuck');
    });

    it('should defer stuck check while trays are animating', () => {
      const gameState = createMockGameStateEntity('playing');
      const screws = [createMockScrewEntity(1, ScrewColor.Red, 'inBoard')];
      // Tray is animating (e.g., being revealed)
      const trays = [createMockTrayEntity(1, ScrewColor.Green, true)];

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        screws,
        gameState,
        trays
      );

      mockPlacementSystem.hasValidMoves.mockReturnValue(false);

      const emitSpy = vi.spyOn(gameEvents, 'emit');

      system.init();
      gameEvents.emit('screw:removalComplete', {});

      // Should NOT emit stuck while tray is animating
      expect(emitSpy).not.toHaveBeenCalledWith('game:stuck');
      const state = (gameState.c as { gameState: { phase: string } }).gameState;
      expect(state.phase).toBe('playing');
    });

    it('should defer stuck check while TrayManagementSystem is busy', () => {
      const gameState = createMockGameStateEntity('playing');
      const screws = [createMockScrewEntity(1, ScrewColor.Red, 'inBoard')];

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        screws,
        gameState
      );

      mockPlacementSystem.hasValidMoves.mockReturnValue(false);
      mockTrayManagementSystem.isBusy.mockReturnValue(true);

      const emitSpy = vi.spyOn(gameEvents, 'emit');

      system.init();
      gameEvents.emit('screw:removalComplete', {});

      // Should NOT emit stuck while tray transitions are pending
      expect(emitSpy).not.toHaveBeenCalledWith('game:stuck');
      const state = (gameState.c as { gameState: { phase: string } }).gameState;
      expect(state.phase).toBe('playing');
    });

    it('should defer stuck check while screws are animating', () => {
      const gameState = createMockGameStateEntity('playing');
      // One screw in board, one animating
      const screws = [
        createMockScrewEntity(1, ScrewColor.Red, 'inBoard'),
        createMockScrewEntity(2, ScrewColor.Blue, 'inTray', true), // animating
      ];

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        screws,
        gameState
      );

      mockPlacementSystem.hasValidMoves.mockReturnValue(false);

      const emitSpy = vi.spyOn(gameEvents, 'emit');

      system.init();
      gameEvents.emit('screw:removalComplete', {});

      // Should NOT emit stuck while screw is animating
      expect(emitSpy).not.toHaveBeenCalledWith('game:stuck');
      const state = (gameState.c as { gameState: { phase: string } }).gameState;
      expect(state.phase).toBe('playing');
    });

    it('should emit game:stuck after tray animation completes', () => {
      const gameState = createMockGameStateEntity('playing');
      const screws = [createMockScrewEntity(1, ScrewColor.Red, 'inBoard')];
      // No animating trays
      const trays = [createMockTrayEntity(1, ScrewColor.Green, false)];

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        screws,
        gameState,
        trays
      );

      mockPlacementSystem.hasValidMoves.mockReturnValue(false);
      mockTrayManagementSystem.isBusy.mockReturnValue(false);

      const emitSpy = vi.spyOn(gameEvents, 'emit');

      system.init();
      // Simulate tray:revealed event after animation completes
      gameEvents.emit('tray:revealed', {});

      // Now it SHOULD emit stuck since animations are done
      expect(emitSpy).toHaveBeenCalledWith('game:stuck');
    });
  });

  describe('checkStuckCondition (via screw:transferComplete)', () => {
    it('should re-check stuck condition after transfer', () => {
      const gameState = createMockGameStateEntity('playing');
      const screws = [createMockScrewEntity(1, ScrewColor.Red, 'inBoard')];

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        screws,
        gameState
      );

      mockPlacementSystem.hasValidMoves.mockReturnValue(false);

      const emitSpy = vi.spyOn(gameEvents, 'emit');

      system.init();
      gameEvents.emit('screw:transferComplete', {});

      expect(emitSpy).toHaveBeenCalledWith('game:stuck');
    });

    it('should skip stuck check if game is already won', () => {
      const gameState = createMockGameStateEntity('won');
      const screws = [createMockScrewEntity(1, ScrewColor.Red, 'inBoard')];

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        screws,
        gameState
      );

      mockPlacementSystem.hasValidMoves.mockReturnValue(false);

      const emitSpy = vi.spyOn(gameEvents, 'emit');

      system.init();
      gameEvents.emit('screw:transferComplete', {});

      expect(emitSpy).not.toHaveBeenCalledWith('game:stuck');
    });
  });

  describe('countInBoardScrews', () => {
    it('should count only screws with state inBoard', () => {
      const gameState = createMockGameStateEntity('playing');
      const screws = [
        createMockScrewEntity(1, ScrewColor.Red, 'inBoard'),
        createMockScrewEntity(2, ScrewColor.Blue, 'inTray'),
        createMockScrewEntity(3, ScrewColor.Green, 'inBoard'),
        createMockScrewEntity(4, ScrewColor.Yellow, 'inBuffer'),
      ];

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        screws,
        gameState
      );

      // Access private method for testing
      const count = system['countInBoardScrews']();
      expect(count).toBe(2);
    });

    it('should return 0 when no screws in board', () => {
      const gameState = createMockGameStateEntity('playing');
      const screws = [
        createMockScrewEntity(1, ScrewColor.Red, 'inTray'),
        createMockScrewEntity(2, ScrewColor.Blue, 'inBuffer'),
      ];

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        screws,
        gameState
      );

      const count = system['countInBoardScrews']();
      expect(count).toBe(0);
    });
  });

  describe('countInBufferScrews', () => {
    it('should count only screws with state inBuffer', () => {
      const gameState = createMockGameStateEntity('playing');
      const screws = [
        createMockScrewEntity(1, ScrewColor.Red, 'inBoard'),
        createMockScrewEntity(2, ScrewColor.Blue, 'inTray'),
        createMockScrewEntity(3, ScrewColor.Green, 'inBuffer'),
        createMockScrewEntity(4, ScrewColor.Yellow, 'inBuffer'),
      ];

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        screws,
        gameState
      );

      const count = system['countInBufferScrews']();
      expect(count).toBe(2);
    });

    it('should return 0 when no screws in buffer', () => {
      const gameState = createMockGameStateEntity('playing');
      const screws = [
        createMockScrewEntity(1, ScrewColor.Red, 'inTray'),
        createMockScrewEntity(2, ScrewColor.Blue, 'inBoard'),
      ];

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        screws,
        gameState
      );

      const count = system['countInBufferScrews']();
      expect(count).toBe(0);
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
