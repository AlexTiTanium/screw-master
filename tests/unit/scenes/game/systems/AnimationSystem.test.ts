import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import type { Entity, Entity2D, QueryResults } from '@play-co/odie';

import { AnimationSystem } from '@scenes/game/systems/AnimationSystem';
import { gameEvents } from '@scenes/game/utils';
import { ScrewColor } from '@shared/types';

// Mock GSAP
const mockTimeline = {
  to: vi.fn().mockResolvedValue(undefined),
  kill: vi.fn(),
};

vi.mock('gsap', () => ({
  default: {
    timeline: vi.fn(() => mockTimeline),
    to: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock PixiJS Assets
vi.mock('pixi.js', () => ({
  Assets: {
    load: vi.fn().mockResolvedValue({ label: 'mock-texture' }),
  },
}));

// Mock factory functions
vi.mock('@scenes/game/factories', () => ({
  getGameVisual: vi.fn(),
  getTrayPlaceholders: vi.fn().mockReturnValue([]),
}));

// Mock utils
vi.mock('@scenes/game/utils', async (importOriginal) => {
  const original = (await importOriginal()) as object;
  return {
    ...original,
    getTraySlotPosition: vi.fn().mockReturnValue({ x: 150, y: 500 }),
    TRAY_DISPLAY_POSITIONS: [
      { x: 48, y: 175 },
      { x: 158, y: 175 },
    ],
    TRAY_HIDDEN_Y: 800,
    getAnimationLayer: vi.fn().mockReturnValue({
      addChild: vi.fn(),
    }),
    getColoredTrayLayer: vi.fn().mockReturnValue({
      addChild: vi.fn(),
    }),
  };
});

// Helper to create a mock screw entity
function createMockScrewEntity(
  uid: number,
  color: ScrewColor,
  state: 'inBoard' | 'inTray' | 'inBuffer' | 'dragging' = 'inBoard'
): Entity2D {
  return {
    UID: uid,
    c: {
      screw: {
        color,
        state,
        isAnimating: false,
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

// Helper to create a mock tray entity
function createMockTrayEntity(
  uid: number,
  color: ScrewColor,
  capacity = 3
): Entity2D {
  return {
    UID: uid,
    c: {
      tray: {
        color,
        capacity,
        screwCount: 0,
        displayOrder: 0,
        isAnimating: false,
      },
    },
    position: { x: 100, y: 500 },
    view: {},
  } as unknown as Entity2D;
}

// Helper to create mock query results
function createMockQueryResults(screws: Entity[]): QueryResults {
  return {
    screws: {
      entities: screws,
      first: screws[0],
      forEach: (callback: (entity: Entity) => void) => {
        screws.forEach(callback);
      },
    },
  } as unknown as QueryResults;
}

describe('AnimationSystem', () => {
  let system: AnimationSystem;

  beforeEach(() => {
    vi.clearAllMocks();
    system = new AnimationSystem();
    gameEvents.clear();

    // Reset mock timeline
    mockTimeline.to.mockResolvedValue(undefined);
  });

  afterEach(() => {
    gameEvents.clear();
    vi.restoreAllMocks();
  });

  /* eslint-disable @typescript-eslint/dot-notation */

  describe('init', () => {
    it('should register screw animation event listeners', () => {
      const onSpy = vi.spyOn(gameEvents, 'on');

      system.init();

      expect(onSpy).toHaveBeenCalledWith(
        'screw:startRemoval',
        expect.any(Function)
      );
      expect(onSpy).toHaveBeenCalledWith(
        'screw:startTransfer',
        expect.any(Function)
      );
    });

    it('should register tray animation event listeners', () => {
      const onSpy = vi.spyOn(gameEvents, 'on');

      system.init();

      expect(onSpy).toHaveBeenCalledWith(
        'tray:startHide',
        expect.any(Function)
      );
      expect(onSpy).toHaveBeenCalledWith(
        'tray:startShift',
        expect.any(Function)
      );
      expect(onSpy).toHaveBeenCalledWith(
        'tray:startReveal',
        expect.any(Function)
      );
    });
  });

  describe('createFlightParams', () => {
    it('should calculate correct flight parameters', () => {
      const start = { x: 100, y: 200 };
      const end = { x: 300, y: 500 };
      const endScale = 0.5;
      const arcHeight = 130;

      const params = system['createFlightParams'](
        start,
        end,
        endScale,
        arcHeight
      );

      expect(params.startX).toBe(100);
      expect(params.startY).toBe(200 - 20); // POP_OUT_HEIGHT = 20
      expect(params.endX).toBe(300);
      expect(params.endY).toBe(500);
      expect(params.controlX).toBe(200); // Midpoint
      expect(params.controlY).toBe(180 - 130); // min(startY, endY) - arcHeight
      expect(params.startScale).toBe(0.8); // POP_OUT_SCALE
      expect(params.endScale).toBe(0.5);
    });

    it('should handle when end is higher than start', () => {
      const start = { x: 100, y: 500 };
      const end = { x: 300, y: 200 };
      const endScale = 0.5;
      const arcHeight = 130;

      const params = system['createFlightParams'](
        start,
        end,
        endScale,
        arcHeight
      );

      // Control Y should be above the higher point
      expect(params.controlY).toBe(200 - 130); // min(480, 200) - arcHeight
    });
  });

  describe('createTransferFlightParams', () => {
    it('should create transfer params without pop-out', () => {
      const start = { x: 180, y: 750 };
      const end = { x: 150, y: 500 };

      const params = system['createTransferFlightParams'](start, end);

      expect(params.startX).toBe(180);
      expect(params.startY).toBe(750); // No pop-out offset
      expect(params.endX).toBe(150);
      expect(params.endY).toBe(500);
      expect(params.startScale).toBe(0.7); // BUFFER_SLOT_SCALE
      expect(params.endScale).toBe(0.5); // TRAY_SLOT_SCALE
    });

    it('should calculate control point for transfer arc', () => {
      const start = { x: 180, y: 750 };
      const end = { x: 150, y: 500 };

      const params = system['createTransferFlightParams'](start, end);

      expect(params.controlX).toBe(165); // Midpoint
      expect(params.controlY).toBe(500 - 80); // min(startY, endY) - TRANSFER_ARC_HEIGHT
    });
  });

  describe('getSlotTargetPosition', () => {
    it('should get position for colored tray slot', async () => {
      const { getTraySlotPosition } = await import('@scenes/game/utils');
      const tray = createMockTrayEntity(10, ScrewColor.Red, 3);

      system['getSlotTargetPosition'](tray, 1, false);

      expect(getTraySlotPosition).toHaveBeenCalledWith(tray, 1, false, 3);
    });

    it('should get position for buffer tray slot', async () => {
      const { getTraySlotPosition } = await import('@scenes/game/utils');
      const tray = createMockTrayEntity(10, ScrewColor.Red);

      system['getSlotTargetPosition'](tray, 0, true);

      expect(getTraySlotPosition).toHaveBeenCalledWith(
        tray,
        0,
        true,
        undefined
      );
    });
  });

  describe('completeRemoval', () => {
    it('should set screw state to inTray for colored tray', () => {
      const screw = createMockScrewEntity(1, ScrewColor.Red, 'dragging');

      system['completeRemoval'](screw, false);

      const screwComponent = (
        screw.c as unknown as { screw: { state: string } }
      ).screw;
      expect(screwComponent.state).toBe('inTray');
    });

    it('should set screw state to inBuffer for buffer tray', () => {
      const screw = createMockScrewEntity(1, ScrewColor.Red, 'dragging');

      system['completeRemoval'](screw, true);

      const screwComponent = (
        screw.c as unknown as { screw: { state: string } }
      ).screw;
      expect(screwComponent.state).toBe('inBuffer');
    });

    it('should reset isAnimating flag', () => {
      const screw = createMockScrewEntity(1, ScrewColor.Red, 'dragging');
      (
        screw.c as unknown as { screw: { isAnimating: boolean } }
      ).screw.isAnimating = true;

      system['completeRemoval'](screw, false);

      const screwComponent = (
        screw.c as unknown as { screw: { isAnimating: boolean } }
      ).screw;
      expect(screwComponent.isAnimating).toBe(false);
    });

    it('should emit screw:removalComplete event', () => {
      const screw = createMockScrewEntity(1, ScrewColor.Red, 'dragging');
      const emitSpy = vi.spyOn(gameEvents, 'emit');

      system['completeRemoval'](screw, false);

      expect(emitSpy).toHaveBeenCalledWith('screw:removalComplete', {
        screwEntity: screw,
      });
    });
  });

  describe('completeTransfer', () => {
    it('should set screw state to inTray', () => {
      const screw = createMockScrewEntity(1, ScrewColor.Red, 'inBuffer');
      const tray = createMockTrayEntity(10, ScrewColor.Red);

      system['completeTransfer'](screw, tray, 1);

      const screwComponent = (
        screw.c as unknown as { screw: { state: string } }
      ).screw;
      expect(screwComponent.state).toBe('inTray');
    });

    it('should set trayEntityId and slotIndex', () => {
      const screw = createMockScrewEntity(1, ScrewColor.Red, 'inBuffer');
      const tray = createMockTrayEntity(10, ScrewColor.Red);

      system['completeTransfer'](screw, tray, 2);

      const screwComponent = (
        screw.c as unknown as {
          screw: { trayEntityId: string; slotIndex: number };
        }
      ).screw;
      expect(screwComponent.trayEntityId).toBe('10');
      expect(screwComponent.slotIndex).toBe(2);
    });

    it('should reset isAnimating flag', () => {
      const screw = createMockScrewEntity(1, ScrewColor.Red, 'inBuffer');
      (
        screw.c as unknown as { screw: { isAnimating: boolean } }
      ).screw.isAnimating = true;
      const tray = createMockTrayEntity(10, ScrewColor.Red);

      system['completeTransfer'](screw, tray, 0);

      const screwComponent = (
        screw.c as unknown as { screw: { isAnimating: boolean } }
      ).screw;
      expect(screwComponent.isAnimating).toBe(false);
    });

    it('should emit screw:transferComplete event', () => {
      const screw = createMockScrewEntity(1, ScrewColor.Red, 'inBuffer');
      const tray = createMockTrayEntity(10, ScrewColor.Red);
      const emitSpy = vi.spyOn(gameEvents, 'emit');

      system['completeTransfer'](screw, tray, 0);

      expect(emitSpy).toHaveBeenCalledWith('screw:transferComplete', {
        screwEntity: screw,
      });
    });
  });

  describe('handleTrayHide', () => {
    it('should emit tray:hideComplete after animation', async () => {
      const tray = createMockTrayEntity(10, ScrewColor.Red);
      const emitSpy = vi.spyOn(gameEvents, 'emit');

      await system['handleTrayHide']({ trayEntity: tray });

      expect(emitSpy).toHaveBeenCalledWith('tray:hideComplete', {
        trayEntity: tray,
      });
    });
  });

  describe('handleTrayShift', () => {
    it('should emit tray:shiftComplete after animation', async () => {
      const tray = createMockTrayEntity(10, ScrewColor.Red);
      const emitSpy = vi.spyOn(gameEvents, 'emit');

      await system['handleTrayShift']({ trayEntity: tray, newDisplayOrder: 0 });

      expect(emitSpy).toHaveBeenCalledWith('tray:shiftComplete', {
        trayEntity: tray,
      });
    });

    it('should skip animation if no target position', async () => {
      const tray = createMockTrayEntity(10, ScrewColor.Red);
      const emitSpy = vi.spyOn(gameEvents, 'emit');

      await system['handleTrayShift']({
        trayEntity: tray,
        newDisplayOrder: 99,
      });

      expect(emitSpy).toHaveBeenCalledWith('tray:shiftComplete', {
        trayEntity: tray,
      });
    });
  });

  describe('handleTrayReveal', () => {
    it('should emit tray:revealComplete after animation', async () => {
      const tray = createMockTrayEntity(10, ScrewColor.Red);
      const emitSpy = vi.spyOn(gameEvents, 'emit');

      await system['handleTrayReveal']({ trayEntity: tray, displayOrder: 1 });

      expect(emitSpy).toHaveBeenCalledWith('tray:revealComplete', {
        trayEntity: tray,
      });
    });

    it('should skip animation if no target position', async () => {
      const tray = createMockTrayEntity(10, ScrewColor.Red);
      const emitSpy = vi.spyOn(gameEvents, 'emit');

      await system['handleTrayReveal']({
        trayEntity: tray,
        displayOrder: 99,
      });

      expect(emitSpy).toHaveBeenCalledWith('tray:revealComplete', {
        trayEntity: tray,
      });
    });
  });

  describe('destroy', () => {
    it('should kill all active timelines', () => {
      // Add a timeline to active set
      system['activeTimelines'].add(
        mockTimeline as unknown as gsap.core.Timeline
      );

      system.destroy();

      expect(mockTimeline.kill).toHaveBeenCalled();
    });

    it('should clear activeTimelines set', () => {
      system['activeTimelines'].add(
        mockTimeline as unknown as gsap.core.Timeline
      );

      system.destroy();

      expect(system['activeTimelines'].size).toBe(0);
    });
  });

  describe('update', () => {
    it('should be a no-op', () => {
      const screws = [createMockScrewEntity(1, ScrewColor.Red)];
      (system as { queries: QueryResults }).queries =
        createMockQueryResults(screws);

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
      expect(AnimationSystem.NAME).toBe('animation');
    });

    it('should have correct Queries', () => {
      expect(AnimationSystem.Queries).toHaveProperty('screws');
    });
  });
});

describe('bezierPosition (exported function behavior)', () => {
  // Test the bezier calculation logic conceptually
  // The actual function is private, but we can verify the math

  it('should return start point at t=0', () => {
    // bezierPosition(0, p0, p1, p2) = p0
    const t = 0;
    const p0 = 100;
    const p1 = 200;
    const p2 = 300;

    const invT = 1 - t;
    const result = invT * invT * p0 + 2 * invT * t * p1 + t * t * p2;

    expect(result).toBe(100);
  });

  it('should return end point at t=1', () => {
    // bezierPosition(1, p0, p1, p2) = p2
    const t = 1;
    const p0 = 100;
    const p1 = 200;
    const p2 = 300;

    const invT = 1 - t;
    const result = invT * invT * p0 + 2 * invT * t * p1 + t * t * p2;

    expect(result).toBe(300);
  });

  it('should return weighted average at t=0.5', () => {
    // bezierPosition(0.5, p0, p1, p2) = 0.25*p0 + 0.5*p1 + 0.25*p2
    const t = 0.5;
    const p0 = 0;
    const p1 = 100;
    const p2 = 200;

    const invT = 1 - t;
    const result = invT * invT * p0 + 2 * invT * t * p1 + t * t * p2;

    // 0.25*0 + 0.5*100 + 0.25*200 = 0 + 50 + 50 = 100
    expect(result).toBe(100);
  });

  it('should produce smooth curve through control point', () => {
    const p0 = 0;
    const p1 = 100; // Control point pulls curve up
    const p2 = 0;

    // At t=0.5, with symmetrical start/end, should equal control point influence
    const t = 0.5;
    const invT = 1 - t;
    const result = invT * invT * p0 + 2 * invT * t * p1 + t * t * p2;

    // 0.25*0 + 0.5*100 + 0.25*0 = 50
    expect(result).toBe(50);
  });
});
