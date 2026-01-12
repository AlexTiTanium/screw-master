import { describe, it, expect, beforeEach } from 'vitest';

import type { Entity, QueryResults } from '@play-co/odie';

import { ScrewPlacementSystem } from '@scenes/game/systems/ScrewPlacementSystem';
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

// Helper to create a mock buffer tray entity
function createMockBufferTrayEntity(
  uid: number,
  capacity: number,
  screwIds: string[]
): Entity {
  return {
    UID: uid,
    c: {
      bufferTray: {
        capacity,
        screwIds,
      },
    },
  } as unknown as Entity;
}

// Helper to create a mock screw entity
function createMockScrewEntity(
  uid: number,
  color: ScrewColor,
  state: string,
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

// Helper to create mock query results
function createMockQueryResults(
  coloredTrays: Entity[],
  bufferTrays: Entity[],
  screws: Entity[]
): QueryResults {
  return {
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
    screws: {
      entities: screws,
      first: screws[0],
      forEach: (callback: (entity: Entity) => void) => {
        screws.forEach(callback);
      },
    },
  } as unknown as QueryResults;
}

describe('ScrewPlacementSystem', () => {
  let system: ScrewPlacementSystem;
  let mockTrayManagementSystem: { isBusy: () => boolean };

  beforeEach(() => {
    system = new ScrewPlacementSystem();

    // Mock TrayManagementSystem
    mockTrayManagementSystem = {
      isBusy: (): boolean => false, // Default: not busy
    };

    // Mock scene.getSystem to return our mock TrayManagementSystem
    (system as unknown as { scene: { getSystem: () => unknown } }).scene = {
      getSystem: (): unknown => mockTrayManagementSystem,
    };
  });

  describe('findPlacementTarget', () => {
    it('should find matching visible colored tray with space', () => {
      const redTray = createMockTrayEntity(1, ScrewColor.Red, 3, 1, 0);
      const blueTray = createMockTrayEntity(2, ScrewColor.Blue, 3, 0, 1);
      const bufferTray = createMockBufferTrayEntity(3, 5, []);

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        [redTray, blueTray],
        [bufferTray],
        []
      );

      const target = system.findPlacementTarget(ScrewColor.Red);

      expect(target).not.toBeNull();
      expect(target?.type).toBe('colored');
      expect(target?.tray).toBe(redTray);
      expect(target?.slotIndex).toBe(1); // screwCount is 1, so next slot is 1
    });

    it('should skip hidden trays (displayOrder >= 2)', () => {
      const hiddenTray = createMockTrayEntity(1, ScrewColor.Red, 3, 0, 2);
      const bufferTray = createMockBufferTrayEntity(2, 5, []);

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        [hiddenTray],
        [bufferTray],
        []
      );

      const target = system.findPlacementTarget(ScrewColor.Red);

      expect(target).not.toBeNull();
      expect(target?.type).toBe('buffer');
    });

    it('should skip animating trays', () => {
      const animatingTray = createMockTrayEntity(
        1,
        ScrewColor.Red,
        3,
        0,
        0,
        true
      );
      const bufferTray = createMockBufferTrayEntity(2, 5, []);

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        [animatingTray],
        [bufferTray],
        []
      );

      const target = system.findPlacementTarget(ScrewColor.Red);

      expect(target).not.toBeNull();
      expect(target?.type).toBe('buffer');
    });

    it('should skip full trays', () => {
      const fullTray = createMockTrayEntity(1, ScrewColor.Red, 3, 3, 0);
      const bufferTray = createMockBufferTrayEntity(2, 5, []);

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        [fullTray],
        [bufferTray],
        []
      );

      const target = system.findPlacementTarget(ScrewColor.Red);

      expect(target).not.toBeNull();
      expect(target?.type).toBe('buffer');
    });

    it('should fall back to buffer when no matching colored tray', () => {
      const blueTray = createMockTrayEntity(1, ScrewColor.Blue, 3, 0, 0);
      const bufferTray = createMockBufferTrayEntity(2, 5, []);

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        [blueTray],
        [bufferTray],
        []
      );

      const target = system.findPlacementTarget(ScrewColor.Red);

      expect(target).not.toBeNull();
      expect(target?.type).toBe('buffer');
      expect(target?.tray).toBe(bufferTray);
      expect(target?.slotIndex).toBe(0);
    });

    it('should return null when buffer is full', () => {
      const blueTray = createMockTrayEntity(1, ScrewColor.Blue, 3, 0, 0);
      const bufferTray = createMockBufferTrayEntity(2, 4, ['1', '2', '3', '4']);

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        [blueTray],
        [bufferTray],
        []
      );

      const target = system.findPlacementTarget(ScrewColor.Red);

      expect(target).toBeNull();
    });

    it('should prefer colored tray over buffer', () => {
      const redTray = createMockTrayEntity(1, ScrewColor.Red, 3, 0, 0);
      const bufferTray = createMockBufferTrayEntity(2, 5, []);

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        [redTray],
        [bufferTray],
        []
      );

      const target = system.findPlacementTarget(ScrewColor.Red);

      expect(target?.type).toBe('colored');
    });

    it('should route to buffer when trayManagementBusy returns true', () => {
      const redTray = createMockTrayEntity(1, ScrewColor.Red, 3, 0, 0);
      const bufferTray = createMockBufferTrayEntity(2, 5, []);

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        [redTray],
        [bufferTray],
        []
      );

      // Make trayManagementBusy return true
      mockTrayManagementSystem.isBusy = (): boolean => true;

      const target = system.findPlacementTarget(ScrewColor.Red);

      expect(target).not.toBeNull();
      expect(target?.type).toBe('buffer');
    });
  });

  describe('findAvailableColoredTray', () => {
    it('should find visible tray with matching color and space', () => {
      const redTray = createMockTrayEntity(1, ScrewColor.Red, 3, 1, 0);

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        [redTray],
        [],
        []
      );

      const tray = system.findAvailableColoredTray(ScrewColor.Red);

      expect(tray).toBe(redTray);
    });

    it('should return null for hidden tray', () => {
      const hiddenTray = createMockTrayEntity(1, ScrewColor.Red, 3, 0, 2);

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        [hiddenTray],
        [],
        []
      );

      const tray = system.findAvailableColoredTray(ScrewColor.Red);

      expect(tray).toBeNull();
    });

    it('should return null for animating tray', () => {
      const animatingTray = createMockTrayEntity(
        1,
        ScrewColor.Red,
        3,
        0,
        0,
        true
      );

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        [animatingTray],
        [],
        []
      );

      const tray = system.findAvailableColoredTray(ScrewColor.Red);

      expect(tray).toBeNull();
    });

    it('should return null for full tray', () => {
      const fullTray = createMockTrayEntity(1, ScrewColor.Red, 3, 3, 0);

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        [fullTray],
        [],
        []
      );

      const tray = system.findAvailableColoredTray(ScrewColor.Red);

      expect(tray).toBeNull();
    });
  });

  describe('reserveSlot', () => {
    it('should increment colored tray screw count', () => {
      const redTray = createMockTrayEntity(1, ScrewColor.Red, 3, 1, 0);
      const screw = createMockScrewEntity(10, ScrewColor.Red, 'removing');

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        [redTray],
        [],
        [screw]
      );

      const target = {
        type: 'colored' as const,
        tray: redTray,
        slotIndex: 1,
      };

      system.reserveSlot(target, screw);

      const trayComponent = (redTray.c as { tray: { screwCount: number } })
        .tray;
      expect(trayComponent.screwCount).toBe(2);
    });

    it('should add screw to buffer tray list', () => {
      const bufferTray = createMockBufferTrayEntity(2, 5, ['100']);
      const screw = createMockScrewEntity(10, ScrewColor.Red, 'removing');

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        [],
        [bufferTray],
        [screw]
      );

      const target = {
        type: 'buffer' as const,
        tray: bufferTray,
        slotIndex: 1,
      };

      system.reserveSlot(target, screw);

      const bufferComponent = (
        bufferTray.c as { bufferTray: { screwIds: string[] } }
      ).bufferTray;
      expect(bufferComponent.screwIds).toContain('10');
      expect(bufferComponent.screwIds).toHaveLength(2);
    });

    it('should update screw trayEntityId and slotIndex', () => {
      const redTray = createMockTrayEntity(1, ScrewColor.Red, 3, 0, 0);
      const screw = createMockScrewEntity(10, ScrewColor.Red, 'removing');

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        [redTray],
        [],
        [screw]
      );

      const target = {
        type: 'colored' as const,
        tray: redTray,
        slotIndex: 0,
      };

      system.reserveSlot(target, screw);

      const screwComponent = (
        screw.c as { screw: { trayEntityId: string; slotIndex: number } }
      ).screw;
      expect(screwComponent.trayEntityId).toBe('1');
      expect(screwComponent.slotIndex).toBe(0);
    });
  });

  describe('findScrewByUid', () => {
    it('should find screw by UID', () => {
      const screw1 = createMockScrewEntity(10, ScrewColor.Red, 'inBoard');
      const screw2 = createMockScrewEntity(20, ScrewColor.Blue, 'inBoard');

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        [],
        [],
        [screw1, screw2]
      );

      const found = system.findScrewByUid('20');

      expect(found).toBe(screw2);
    });

    it('should return undefined for non-existent UID', () => {
      const screw = createMockScrewEntity(10, ScrewColor.Red, 'inBoard');

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        [],
        [],
        [screw]
      );

      const found = system.findScrewByUid('999');

      expect(found).toBeUndefined();
    });
  });

  describe('hasValidMoves', () => {
    it('should return true if any screw can be placed', () => {
      const redTray = createMockTrayEntity(1, ScrewColor.Red, 3, 0, 0);
      const bufferTray = createMockBufferTrayEntity(2, 5, []);
      const screw = createMockScrewEntity(10, ScrewColor.Red, 'inBoard');

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        [redTray],
        [bufferTray],
        [screw]
      );

      const hasValid = system.hasValidMoves();

      expect(hasValid).toBe(true);
    });

    it('should return false if no screws are in board', () => {
      const redTray = createMockTrayEntity(1, ScrewColor.Red, 3, 0, 0);
      const bufferTray = createMockBufferTrayEntity(2, 5, []);
      const screw = createMockScrewEntity(10, ScrewColor.Red, 'inTray');

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        [redTray],
        [bufferTray],
        [screw]
      );

      const hasValid = system.hasValidMoves();

      expect(hasValid).toBe(false);
    });

    it('should return false if animating screws only', () => {
      const redTray = createMockTrayEntity(1, ScrewColor.Red, 3, 0, 0);
      const bufferTray = createMockBufferTrayEntity(2, 5, []);
      const screw = createMockScrewEntity(10, ScrewColor.Red, 'inBoard', true);

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        [redTray],
        [bufferTray],
        [screw]
      );

      const hasValid = system.hasValidMoves();

      expect(hasValid).toBe(false);
    });

    it('should return false when buffer full and no matching tray', () => {
      const blueTray = createMockTrayEntity(1, ScrewColor.Blue, 3, 0, 0);
      const bufferTray = createMockBufferTrayEntity(2, 4, ['1', '2', '3', '4']);
      const screw = createMockScrewEntity(10, ScrewColor.Red, 'inBoard');

      (system as { queries: QueryResults }).queries = createMockQueryResults(
        [blueTray],
        [bufferTray],
        [screw]
      );

      const hasValid = system.hasValidMoves();

      expect(hasValid).toBe(false);
    });
  });
});
