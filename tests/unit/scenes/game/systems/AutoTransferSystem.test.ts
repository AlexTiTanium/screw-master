import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import type { Entity, QueryResults } from '@play-co/odie';

import { AutoTransferSystem } from '@scenes/game/systems/AutoTransferSystem';
import { ScrewPlacementSystem } from '@scenes/game/systems/ScrewPlacementSystem';
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

// Helper to create a mock buffer tray entity
function createMockBufferTrayEntity(
  uid: number,
  screwIds: string[] = []
): Entity {
  return {
    UID: uid,
    c: {
      bufferTray: {
        capacity: 3,
        screwIds: [...screwIds],
      },
    },
    position: { x: 180, y: 750 },
  } as unknown as Entity;
}

// Helper to create a mock colored tray entity
function createMockTrayEntity(
  uid: number,
  color: ScrewColor,
  screwCount = 0,
  capacity = 3
): Entity {
  return {
    UID: uid,
    c: {
      tray: {
        color,
        capacity,
        screwCount,
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
  coloredTrays: Entity[],
  bufferTrays: Entity[]
): QueryResults {
  return {
    screws: {
      entities: screws,
      first: screws[0],
      forEach: (callback: (entity: Entity) => void) => {
        screws.forEach(callback);
      },
    },
    coloredTrays: {
      entities: coloredTrays,
      first: coloredTrays[0],
      forEach: (callback: (entity: Entity) => void) => {
        coloredTrays.forEach(callback);
      },
    },
    bufferTrays: {
      entities: bufferTrays,
      first: bufferTrays[0],
      forEach: (callback: (entity: Entity) => void) => {
        bufferTrays.forEach(callback);
      },
    },
  } as unknown as QueryResults;
}

describe('AutoTransferSystem', () => {
  let system: AutoTransferSystem;
  let mockPlacementSystem: {
    findScrewByUid: ReturnType<typeof vi.fn>;
    findAvailableColoredTray: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    system = new AutoTransferSystem();
    mockPlacementSystem = {
      findScrewByUid: vi.fn(),
      findAvailableColoredTray: vi.fn(),
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
      expect(onSpy).toHaveBeenCalledWith('tray:revealed', expect.any(Function));
    });
  });

  describe('checkAutoTransfer (via screw:removalComplete)', () => {
    it('should skip if already transferring', () => {
      const bufferTray = createMockBufferTrayEntity(100, ['1']);
      const screw = createMockScrewEntity(1, ScrewColor.Red, 'inBuffer');
      const tray = createMockTrayEntity(10, ScrewColor.Red);

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        [screw],
        [tray],
        [bufferTray]
      );

      mockPlacementSystem.findScrewByUid.mockReturnValue(screw);
      mockPlacementSystem.findAvailableColoredTray.mockReturnValue(tray);

      // Set isTransferring to true
      system['isTransferring'] = true;

      const emitSpy = vi.spyOn(gameEvents, 'emit');

      system.init();
      gameEvents.emit('screw:removalComplete', {});

      expect(emitSpy).not.toHaveBeenCalledWith(
        'screw:startTransfer',
        expect.anything()
      );
    });

    it('should skip if no buffer tray', () => {
      const screw = createMockScrewEntity(1, ScrewColor.Red, 'inBuffer');
      const tray = createMockTrayEntity(10, ScrewColor.Red);

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        [screw],
        [tray],
        [] // No buffer trays
      );

      const emitSpy = vi.spyOn(gameEvents, 'emit');

      system.init();
      gameEvents.emit('screw:removalComplete', {});

      expect(emitSpy).not.toHaveBeenCalledWith(
        'screw:startTransfer',
        expect.anything()
      );
    });

    it('should skip if buffer is empty', () => {
      const bufferTray = createMockBufferTrayEntity(100, []); // Empty buffer
      const screw = createMockScrewEntity(1, ScrewColor.Red, 'inBoard');
      const tray = createMockTrayEntity(10, ScrewColor.Red);

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        [screw],
        [tray],
        [bufferTray]
      );

      const emitSpy = vi.spyOn(gameEvents, 'emit');

      system.init();
      gameEvents.emit('screw:removalComplete', {});

      expect(emitSpy).not.toHaveBeenCalledWith(
        'screw:startTransfer',
        expect.anything()
      );
    });

    it('should skip screws that are animating', () => {
      const bufferTray = createMockBufferTrayEntity(100, ['1']);
      const screw = createMockScrewEntity(1, ScrewColor.Red, 'inBuffer', true); // Animating
      const tray = createMockTrayEntity(10, ScrewColor.Red);

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        [screw],
        [tray],
        [bufferTray]
      );

      mockPlacementSystem.findScrewByUid.mockReturnValue(screw);
      mockPlacementSystem.findAvailableColoredTray.mockReturnValue(tray);

      const emitSpy = vi.spyOn(gameEvents, 'emit');

      system.init();
      gameEvents.emit('screw:removalComplete', {});

      expect(emitSpy).not.toHaveBeenCalledWith(
        'screw:startTransfer',
        expect.anything()
      );
    });

    it('should skip if no matching tray available', () => {
      const bufferTray = createMockBufferTrayEntity(100, ['1']);
      const screw = createMockScrewEntity(1, ScrewColor.Red, 'inBuffer');
      const tray = createMockTrayEntity(10, ScrewColor.Blue); // Wrong color

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        [screw],
        [tray],
        [bufferTray]
      );

      mockPlacementSystem.findScrewByUid.mockReturnValue(screw);
      mockPlacementSystem.findAvailableColoredTray.mockReturnValue(null);

      const emitSpy = vi.spyOn(gameEvents, 'emit');

      system.init();
      gameEvents.emit('screw:removalComplete', {});

      expect(emitSpy).not.toHaveBeenCalledWith(
        'screw:startTransfer',
        expect.anything()
      );
    });

    it('should skip if screw entity not found', () => {
      const bufferTray = createMockBufferTrayEntity(100, ['1']);
      const tray = createMockTrayEntity(10, ScrewColor.Red);

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        [],
        [tray],
        [bufferTray]
      );

      mockPlacementSystem.findScrewByUid.mockReturnValue(null);

      const emitSpy = vi.spyOn(gameEvents, 'emit');

      system.init();
      gameEvents.emit('screw:removalComplete', {});

      expect(emitSpy).not.toHaveBeenCalledWith(
        'screw:startTransfer',
        expect.anything()
      );
    });

    it('should initiate transfer when matching tray is available', () => {
      const bufferTray = createMockBufferTrayEntity(100, ['1']);
      const screw = createMockScrewEntity(1, ScrewColor.Red, 'inBuffer');
      const tray = createMockTrayEntity(10, ScrewColor.Red);

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        [screw],
        [tray],
        [bufferTray]
      );

      mockPlacementSystem.findScrewByUid.mockReturnValue(screw);
      mockPlacementSystem.findAvailableColoredTray.mockReturnValue(tray);

      const emitSpy = vi.spyOn(gameEvents, 'emit');

      system.init();
      gameEvents.emit('screw:removalComplete', {});

      expect(emitSpy).toHaveBeenCalledWith(
        'screw:startTransfer',
        expect.objectContaining({
          screwEntity: screw,
          targetTray: tray,
          slotIndex: 0,
        })
      );
    });

    it('should process screws in FIFO order', () => {
      const bufferTray = createMockBufferTrayEntity(100, ['1', '2']);
      const screw1 = createMockScrewEntity(1, ScrewColor.Red, 'inBuffer');
      const screw2 = createMockScrewEntity(2, ScrewColor.Blue, 'inBuffer');
      const tray = createMockTrayEntity(10, ScrewColor.Red);

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        [screw1, screw2],
        [tray],
        [bufferTray]
      );

      mockPlacementSystem.findScrewByUid.mockImplementation((id: string) => {
        if (id === '1') return screw1;
        if (id === '2') return screw2;
        return null;
      });
      // Only first screw has matching tray
      mockPlacementSystem.findAvailableColoredTray.mockImplementation(
        (color: ScrewColor) => (color === ScrewColor.Red ? tray : null)
      );

      const emitSpy = vi.spyOn(gameEvents, 'emit');

      system.init();
      gameEvents.emit('screw:removalComplete', {});

      // Should transfer first screw (FIFO)
      expect(emitSpy).toHaveBeenCalledWith(
        'screw:startTransfer',
        expect.objectContaining({ screwEntity: screw1 })
      );
    });

    it('should only transfer one screw at a time', () => {
      const bufferTray = createMockBufferTrayEntity(100, ['1', '2']);
      const screw1 = createMockScrewEntity(1, ScrewColor.Red, 'inBuffer');
      const screw2 = createMockScrewEntity(2, ScrewColor.Red, 'inBuffer');
      const tray = createMockTrayEntity(10, ScrewColor.Red, 0, 3);

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        [screw1, screw2],
        [tray],
        [bufferTray]
      );

      mockPlacementSystem.findScrewByUid.mockImplementation((id: string) => {
        if (id === '1') return screw1;
        if (id === '2') return screw2;
        return null;
      });
      mockPlacementSystem.findAvailableColoredTray.mockReturnValue(tray);

      const emitSpy = vi.spyOn(gameEvents, 'emit');

      system.init();
      gameEvents.emit('screw:removalComplete', {});

      // Should only emit one transfer event
      const transferCalls = emitSpy.mock.calls.filter(
        (call) => call[0] === 'screw:startTransfer'
      );
      expect(transferCalls).toHaveLength(1);
    });
  });

  describe('initiateTransfer', () => {
    it('should set isTransferring to true', () => {
      const bufferTray = createMockBufferTrayEntity(100, ['1']);
      const screw = createMockScrewEntity(1, ScrewColor.Red, 'inBuffer');
      const tray = createMockTrayEntity(10, ScrewColor.Red);

      system['initiateTransfer'](screw, tray, bufferTray);

      expect(system['isTransferring']).toBe(true);
    });

    it('should remove screw from buffer screwIds', () => {
      const bufferTray = createMockBufferTrayEntity(100, ['1', '2']);
      const screw = createMockScrewEntity(1, ScrewColor.Red, 'inBuffer');
      const tray = createMockTrayEntity(10, ScrewColor.Red);

      system['initiateTransfer'](screw, tray, bufferTray);

      const buffer = (bufferTray.c as { bufferTray: { screwIds: string[] } })
        .bufferTray;
      expect(buffer.screwIds).toEqual(['2']);
    });

    it('should increment tray screwCount', () => {
      const bufferTray = createMockBufferTrayEntity(100, ['1']);
      const screw = createMockScrewEntity(1, ScrewColor.Red, 'inBuffer');
      const tray = createMockTrayEntity(10, ScrewColor.Red, 1);

      system['initiateTransfer'](screw, tray, bufferTray);

      const trayComponent = (tray.c as { tray: { screwCount: number } }).tray;
      expect(trayComponent.screwCount).toBe(2);
    });

    it('should set screw to animating', () => {
      const bufferTray = createMockBufferTrayEntity(100, ['1']);
      const screw = createMockScrewEntity(1, ScrewColor.Red, 'inBuffer');
      const tray = createMockTrayEntity(10, ScrewColor.Red);

      system['initiateTransfer'](screw, tray, bufferTray);

      const screwComponent = (screw.c as { screw: { isAnimating: boolean } })
        .screw;
      expect(screwComponent.isAnimating).toBe(true);
    });

    it('should emit screw:startTransfer event', () => {
      const bufferTray = createMockBufferTrayEntity(100, ['1']);
      const screw = createMockScrewEntity(1, ScrewColor.Red, 'inBuffer');
      const tray = createMockTrayEntity(10, ScrewColor.Red, 2);

      const emitSpy = vi.spyOn(gameEvents, 'emit');

      system['initiateTransfer'](screw, tray, bufferTray);

      expect(emitSpy).toHaveBeenCalledWith('screw:startTransfer', {
        screwEntity: screw,
        targetTray: tray,
        slotIndex: 2, // Current screwCount before increment
      });
    });

    it('should handle screw not in buffer gracefully', () => {
      const bufferTray = createMockBufferTrayEntity(100, ['2', '3']);
      const screw = createMockScrewEntity(1, ScrewColor.Red, 'inBuffer');
      const tray = createMockTrayEntity(10, ScrewColor.Red);

      // Screw 1 is not in buffer.screwIds
      expect(() => {
        system['initiateTransfer'](screw, tray, bufferTray);
      }).not.toThrow();

      // Buffer should remain unchanged
      const buffer = (bufferTray.c as { bufferTray: { screwIds: string[] } })
        .bufferTray;
      expect(buffer.screwIds).toEqual(['2', '3']);
    });
  });

  describe('onTransferComplete (via screw:transferComplete)', () => {
    it('should reset isTransferring flag', () => {
      const bufferTray = createMockBufferTrayEntity(100, []);

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        [],
        [],
        [bufferTray]
      );

      system['isTransferring'] = true;

      system.init();
      gameEvents.emit('screw:transferComplete', {});

      expect(system['isTransferring']).toBe(false);
    });

    it('should check for more transfers after completion', () => {
      const bufferTray = createMockBufferTrayEntity(100, ['1']);
      const screw = createMockScrewEntity(1, ScrewColor.Red, 'inBuffer');
      const tray = createMockTrayEntity(10, ScrewColor.Red);

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        [screw],
        [tray],
        [bufferTray]
      );

      mockPlacementSystem.findScrewByUid.mockReturnValue(screw);
      mockPlacementSystem.findAvailableColoredTray.mockReturnValue(tray);

      system['isTransferring'] = true;

      const emitSpy = vi.spyOn(gameEvents, 'emit');

      system.init();
      gameEvents.emit('screw:transferComplete', {});

      // Should trigger another transfer
      expect(emitSpy).toHaveBeenCalledWith(
        'screw:startTransfer',
        expect.anything()
      );
    });
  });

  describe('checkAutoTransfer (via tray:revealed)', () => {
    it('should check for transfers when new tray is revealed', () => {
      const bufferTray = createMockBufferTrayEntity(100, ['1']);
      const screw = createMockScrewEntity(1, ScrewColor.Red, 'inBuffer');
      const tray = createMockTrayEntity(10, ScrewColor.Red);

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        [screw],
        [tray],
        [bufferTray]
      );

      mockPlacementSystem.findScrewByUid.mockReturnValue(screw);
      mockPlacementSystem.findAvailableColoredTray.mockReturnValue(tray);

      const emitSpy = vi.spyOn(gameEvents, 'emit');

      system.init();
      gameEvents.emit('tray:revealed', { trayEntity: tray });

      expect(emitSpy).toHaveBeenCalledWith(
        'screw:startTransfer',
        expect.anything()
      );
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

  describe('static properties', () => {
    it('should have correct NAME', () => {
      expect(AutoTransferSystem.NAME).toBe('autoTransfer');
    });

    it('should have correct Queries', () => {
      expect(AutoTransferSystem.Queries).toHaveProperty('coloredTrays');
      expect(AutoTransferSystem.Queries).toHaveProperty('bufferTrays');
      expect(AutoTransferSystem.Queries).toHaveProperty('screws');
    });
  });
});
