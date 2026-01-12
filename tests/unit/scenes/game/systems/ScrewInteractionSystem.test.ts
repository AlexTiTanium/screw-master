import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import type { Entity, Entity2D, QueryResults } from '@play-co/odie';

import { ScrewInteractionSystem } from '@scenes/game/systems/ScrewInteractionSystem';
import { ScrewPlacementSystem } from '@scenes/game/systems/ScrewPlacementSystem';
import { gameEvents } from '@scenes/game/utils';
import { getComponents } from '@scenes/game/types';
import { ScrewColor } from '@shared/types';

// Mock TouchInput
vi.mock('@play-co/astro', () => ({
  TouchInput: vi.fn().mockImplementation(() => ({
    onTap: null,
    enabled: true,
  })),
}));

// Helper to create a mock screw entity
function createMockScrewEntity(
  uid: number,
  color: ScrewColor,
  state: 'inBoard' | 'inTray' | 'inBuffer' | 'dragging',
  isAnimating = false
): Entity2D {
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
    view: {
      eventMode: 'none',
      cursor: 'default',
    },
    position: { x: 100, y: 100 },
  } as unknown as Entity2D;
}

// Helper to create a mock game state entity
function createMockGameStateEntity(
  phase: 'playing' | 'won' | 'stuck' = 'playing'
): Entity {
  return {
    UID: 999,
    c: {
      gameState: {
        phase,
        winConditionType: 'allScrewsRemoved',
        removedScrews: 0,
        totalScrews: 3,
      },
    },
  } as unknown as Entity;
}

// Helper to create a mock tray entity
function createMockTrayEntity(uid: number, color: ScrewColor): Entity {
  return {
    UID: uid,
    c: {
      tray: {
        color,
        capacity: 3,
        screwCount: 0,
        displayOrder: 0,
        isAnimating: false,
      },
    },
    position: { x: 100, y: 500 },
  } as unknown as Entity;
}

// Helper to create mock query results
function createMockQueryResults(
  screws: Entity[],
  gameState: Entity | null
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
  } as unknown as QueryResults;
}

describe('ScrewInteractionSystem', () => {
  let system: ScrewInteractionSystem;
  let mockPlacementSystem: {
    findPlacementTarget: ReturnType<typeof vi.fn>;
    reserveSlot: ReturnType<typeof vi.fn>;
    isBufferFull: ReturnType<typeof vi.fn>;
    anyTrayAnimating: ReturnType<typeof vi.fn>;
    trayManagementBusy: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    system = new ScrewInteractionSystem();
    mockPlacementSystem = {
      findPlacementTarget: vi.fn(),
      reserveSlot: vi.fn(),
      isBufferFull: vi.fn().mockReturnValue(false),
      anyTrayAnimating: vi.fn().mockReturnValue(false),
      trayManagementBusy: vi.fn().mockReturnValue(false),
    };

    // Mock scene.getSystem
    (
      system as unknown as { scene: { getSystem: (s: unknown) => unknown } }
    ).scene = {
      getSystem: (SystemClass: unknown): unknown => {
        if (SystemClass === ScrewPlacementSystem) {
          return mockPlacementSystem;
        }
        return null;
      },
    };

    gameEvents.clear();
  });

  afterEach(() => {
    gameEvents.clear();
    vi.restoreAllMocks();
  });

  /* eslint-disable @typescript-eslint/dot-notation */

  describe('initialization', () => {
    it('should start with initialized flag as false', () => {
      expect(system['initialized']).toBe(false);
    });

    it('should start with empty touchInputs map', () => {
      expect(system['touchInputs'].size).toBe(0);
    });
  });

  describe('update (first call initializes)', () => {
    it('should initialize touch inputs on first update', () => {
      const screws = [createMockScrewEntity(1, ScrewColor.Red, 'inBoard')];
      const gameState = createMockGameStateEntity('playing');

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        screws,
        gameState
      );

      const time = { deltaTime: 16 } as unknown as Parameters<
        typeof system.update
      >[0];
      system.update(time);

      expect(system['initialized']).toBe(true);
    });

    it('should setup touch input for each screw on first update', () => {
      const screws = [
        createMockScrewEntity(1, ScrewColor.Red, 'inBoard'),
        createMockScrewEntity(2, ScrewColor.Blue, 'inBoard'),
      ];
      const gameState = createMockGameStateEntity('playing');

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        screws,
        gameState
      );

      const time = { deltaTime: 16 } as unknown as Parameters<
        typeof system.update
      >[0];
      system.update(time);

      expect(system['touchInputs'].size).toBe(2);
    });

    it('should setup new screws on subsequent updates', () => {
      const screws = [createMockScrewEntity(1, ScrewColor.Red, 'inBoard')];
      const gameState = createMockGameStateEntity('playing');

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        screws,
        gameState
      );

      const time = { deltaTime: 16 } as unknown as Parameters<
        typeof system.update
      >[0];
      system.update(time);

      expect(system['touchInputs'].size).toBe(1);

      // Add new screw
      screws.push(createMockScrewEntity(2, ScrewColor.Blue, 'inBoard'));
      (system as { queries: QueryResults }).queries = createMockQueryResults(
        screws,
        gameState
      );

      system.update(time);

      expect(system['touchInputs'].size).toBe(2);
    });

    it('should not duplicate touch inputs for existing screws', () => {
      const screws = [createMockScrewEntity(1, ScrewColor.Red, 'inBoard')];
      const gameState = createMockGameStateEntity('playing');

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        screws,
        gameState
      );

      const time = { deltaTime: 16 } as unknown as Parameters<
        typeof system.update
      >[0];

      system.update(time);
      system.update(time);
      system.update(time);

      expect(system['touchInputs'].size).toBe(1);
    });
  });

  describe('setupTouchInput', () => {
    it('should set eventMode to static', () => {
      const screw = createMockScrewEntity(1, ScrewColor.Red, 'inBoard');

      system['setupTouchInput'](screw);

      expect(screw.view.eventMode).toBe('static');
    });

    it('should set cursor to pointer', () => {
      const screw = createMockScrewEntity(1, ScrewColor.Red, 'inBoard');

      system['setupTouchInput'](screw);

      expect(screw.view.cursor).toBe('pointer');
    });

    it('should skip if entity has no view', () => {
      const screw = {
        UID: 1,
        c: { screw: { color: ScrewColor.Red, state: 'inBoard' } },
        view: null,
      } as unknown as Entity;

      expect(() => {
        system['setupTouchInput'](screw);
      }).not.toThrow();

      expect(system['touchInputs'].size).toBe(0);
    });

    it('should skip if already set up', () => {
      const screw = createMockScrewEntity(1, ScrewColor.Red, 'inBoard');

      system['setupTouchInput'](screw);
      const firstSize = system['touchInputs'].size;

      system['setupTouchInput'](screw);

      expect(system['touchInputs'].size).toBe(firstSize);
    });
  });

  describe('canInteractWithScrew', () => {
    it('should return true for screw in board that is not animating', () => {
      const gameState = createMockGameStateEntity('playing');
      const screws: Entity[] = [];

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        screws,
        gameState
      );

      const screwData = { state: 'inBoard', isAnimating: false };
      const result = system['canInteractWithScrew'](
        screwData as Parameters<(typeof system)['canInteractWithScrew']>[0]
      );

      expect(result).toBe(true);
    });

    it('should return false for screw not in board', () => {
      const gameState = createMockGameStateEntity('playing');
      const screws: Entity[] = [];

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        screws,
        gameState
      );

      const screwData = { state: 'inTray', isAnimating: false };
      const result = system['canInteractWithScrew'](
        screwData as Parameters<(typeof system)['canInteractWithScrew']>[0]
      );

      expect(result).toBe(false);
    });

    it('should return false for animating screw', () => {
      const gameState = createMockGameStateEntity('playing');
      const screws: Entity[] = [];

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        screws,
        gameState
      );

      const screwData = { state: 'inBoard', isAnimating: true };
      const result = system['canInteractWithScrew'](
        screwData as Parameters<(typeof system)['canInteractWithScrew']>[0]
      );

      expect(result).toBe(false);
    });

    it('should return false when game phase is not playing', () => {
      const gameState = createMockGameStateEntity('won');
      const screws: Entity[] = [];

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        screws,
        gameState
      );

      const screwData = { state: 'inBoard', isAnimating: false };
      const result = system['canInteractWithScrew'](
        screwData as Parameters<(typeof system)['canInteractWithScrew']>[0]
      );

      expect(result).toBe(false);
    });

    it('should return false when game is stuck', () => {
      const gameState = createMockGameStateEntity('stuck');
      const screws: Entity[] = [];

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        screws,
        gameState
      );

      const screwData = { state: 'inBoard', isAnimating: false };
      const result = system['canInteractWithScrew'](
        screwData as Parameters<(typeof system)['canInteractWithScrew']>[0]
      );

      expect(result).toBe(false);
    });

    it('should return true when no game state entity exists', () => {
      const screws: Entity[] = [];

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        screws,
        null
      );

      const screwData = { state: 'inBoard', isAnimating: false };
      const result = system['canInteractWithScrew'](
        screwData as Parameters<(typeof system)['canInteractWithScrew']>[0]
      );

      expect(result).toBe(true);
    });
  });

  describe('handleScrewTap', () => {
    it('should not proceed if screw cannot be interacted with', () => {
      const screw = createMockScrewEntity(1, ScrewColor.Red, 'inTray');
      const gameState = createMockGameStateEntity('playing');

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        [screw],
        gameState
      );

      const emitSpy = vi.spyOn(gameEvents, 'emit');

      system['handleScrewTap'](screw);

      expect(emitSpy).not.toHaveBeenCalledWith(
        'screw:startRemoval',
        expect.anything()
      );
    });

    it('should not proceed if no placement target found', () => {
      const screw = createMockScrewEntity(1, ScrewColor.Red, 'inBoard');
      const gameState = createMockGameStateEntity('playing');

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        [screw],
        gameState
      );

      mockPlacementSystem.findPlacementTarget.mockReturnValue(null);

      const emitSpy = vi.spyOn(gameEvents, 'emit');

      system['handleScrewTap'](screw);

      expect(emitSpy).not.toHaveBeenCalledWith(
        'screw:startRemoval',
        expect.anything()
      );
    });

    it('should reserve slot and emit event when valid tap', () => {
      const screw = createMockScrewEntity(1, ScrewColor.Red, 'inBoard');
      const tray = createMockTrayEntity(10, ScrewColor.Red);
      const gameState = createMockGameStateEntity('playing');

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        [screw],
        gameState
      );

      const target = { tray, slotIndex: 0, type: 'colored' };
      mockPlacementSystem.findPlacementTarget.mockReturnValue(target);

      const emitSpy = vi.spyOn(gameEvents, 'emit');

      system['handleScrewTap'](screw);

      expect(mockPlacementSystem.reserveSlot).toHaveBeenCalledWith(
        target,
        screw
      );
      expect(emitSpy).toHaveBeenCalledWith('screw:startRemoval', {
        screwEntity: screw,
        targetTray: tray,
        slotIndex: 0,
        isBuffer: false,
      });
    });

    it('should set isBuffer to true when target is buffer', () => {
      const screw = createMockScrewEntity(1, ScrewColor.Red, 'inBoard');
      const tray = createMockTrayEntity(10, ScrewColor.Red);
      const gameState = createMockGameStateEntity('playing');

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        [screw],
        gameState
      );

      const target = { tray, slotIndex: 0, type: 'buffer' };
      mockPlacementSystem.findPlacementTarget.mockReturnValue(target);

      const emitSpy = vi.spyOn(gameEvents, 'emit');

      system['handleScrewTap'](screw);

      expect(emitSpy).toHaveBeenCalledWith(
        'screw:startRemoval',
        expect.objectContaining({ isBuffer: true })
      );
    });

    it('should set screw to animating and dragging state', () => {
      const screw = createMockScrewEntity(1, ScrewColor.Red, 'inBoard');
      const tray = createMockTrayEntity(10, ScrewColor.Red);
      const gameState = createMockGameStateEntity('playing');

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        [screw],
        gameState
      );

      mockPlacementSystem.findPlacementTarget.mockReturnValue({
        tray,
        slotIndex: 0,
        type: 'colored',
      });

      system['handleScrewTap'](screw);

      const screwComponent = getComponents<{
        screw: { isAnimating: boolean; state: string };
      }>(screw).screw;
      expect(screwComponent.isAnimating).toBe(true);
      expect(screwComponent.state).toBe('dragging');
    });

    it('should block tap when buffer is full and trays are animating', () => {
      const screw = createMockScrewEntity(1, ScrewColor.Red, 'inBoard');
      const gameState = createMockGameStateEntity('playing');

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        [screw],
        gameState
      );

      // Simulate buffer full AND trays animating
      mockPlacementSystem.isBufferFull.mockReturnValue(true);
      mockPlacementSystem.anyTrayAnimating.mockReturnValue(true);

      const emitSpy = vi.spyOn(gameEvents, 'emit');
      const consoleSpy = vi
        .spyOn(console, 'log')
        .mockImplementation((): void => {
          // Intentionally empty - suppress console output during test
        });

      system['handleScrewTap'](screw);

      // Should not emit removal event
      expect(emitSpy).not.toHaveBeenCalledWith(
        'screw:startRemoval',
        expect.anything()
      );
      // Should log blocked message with state info
      expect(consoleSpy).toHaveBeenCalledWith(
        'BLOCKED: bufferFull=true animating=true busy=false'
      );

      consoleSpy.mockRestore();
    });

    it('should allow tap when buffer is full but trays are not animating', () => {
      const screw = createMockScrewEntity(1, ScrewColor.Red, 'inBoard');
      const tray = createMockTrayEntity(10, ScrewColor.Red);
      const gameState = createMockGameStateEntity('playing');

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        [screw],
        gameState
      );

      // Buffer full but trays NOT animating - colored tray available
      mockPlacementSystem.isBufferFull.mockReturnValue(true);
      mockPlacementSystem.anyTrayAnimating.mockReturnValue(false);
      mockPlacementSystem.findPlacementTarget.mockReturnValue({
        tray,
        slotIndex: 0,
        type: 'colored',
      });

      const emitSpy = vi.spyOn(gameEvents, 'emit');

      system['handleScrewTap'](screw);

      // Should emit removal event
      expect(emitSpy).toHaveBeenCalledWith(
        'screw:startRemoval',
        expect.anything()
      );
    });

    it('should allow tap when trays are animating but buffer has space', () => {
      const screw = createMockScrewEntity(1, ScrewColor.Red, 'inBoard');
      const tray = createMockTrayEntity(10, ScrewColor.Red);
      const gameState = createMockGameStateEntity('playing');

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        [screw],
        gameState
      );

      // Trays animating but buffer has space
      mockPlacementSystem.isBufferFull.mockReturnValue(false);
      mockPlacementSystem.anyTrayAnimating.mockReturnValue(true);
      mockPlacementSystem.findPlacementTarget.mockReturnValue({
        tray,
        slotIndex: 0,
        type: 'buffer',
      });

      const emitSpy = vi.spyOn(gameEvents, 'emit');

      system['handleScrewTap'](screw);

      // Should emit removal event (goes to buffer)
      expect(emitSpy).toHaveBeenCalledWith(
        'screw:startRemoval',
        expect.objectContaining({ isBuffer: true })
      );
    });
  });

  describe('cleanupTouchInput', () => {
    it('should disable and remove touch input for entity', () => {
      const screw = createMockScrewEntity(1, ScrewColor.Red, 'inBoard');

      system['setupTouchInput'](screw);
      expect(system['touchInputs'].size).toBe(1);

      system['cleanupTouchInput'](screw);
      expect(system['touchInputs'].size).toBe(0);
    });

    it('should handle entity without touch input gracefully', () => {
      const screw = createMockScrewEntity(1, ScrewColor.Red, 'inBoard');

      expect(() => {
        system['cleanupTouchInput'](screw);
      }).not.toThrow();
    });
  });

  describe('destroy', () => {
    it('should cleanup all touch inputs', () => {
      const screws = [
        createMockScrewEntity(1, ScrewColor.Red, 'inBoard'),
        createMockScrewEntity(2, ScrewColor.Blue, 'inBoard'),
      ];
      const gameState = createMockGameStateEntity('playing');

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        screws,
        gameState
      );

      const time = { deltaTime: 16 } as unknown as Parameters<
        typeof system.update
      >[0];
      system.update(time);

      expect(system['touchInputs'].size).toBe(2);

      system.destroy();

      expect(system['touchInputs'].size).toBe(0);
    });

    it('should reset initialized flag', () => {
      const screws = [createMockScrewEntity(1, ScrewColor.Red, 'inBoard')];
      const gameState = createMockGameStateEntity('playing');

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        screws,
        gameState
      );

      const time = { deltaTime: 16 } as unknown as Parameters<
        typeof system.update
      >[0];
      system.update(time);

      expect(system['initialized']).toBe(true);

      system.destroy();

      expect(system['initialized']).toBe(false);
    });
  });

  describe('static properties', () => {
    it('should have correct NAME', () => {
      expect(ScrewInteractionSystem.NAME).toBe('screwInteraction');
    });

    it('should have correct Queries', () => {
      expect(ScrewInteractionSystem.Queries).toHaveProperty('screws');
      expect(ScrewInteractionSystem.Queries).toHaveProperty('gameState');
    });
  });
});
