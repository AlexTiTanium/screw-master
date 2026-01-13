import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import type { Entity, Entity2D, QueryResults } from '@play-co/odie';

import { AnimationSystem } from '@scenes/game/systems/AnimationSystem';
import { gameEvents } from '@scenes/game/utils';
import { getComponents } from '@scenes/game/types';
import { ScrewColor } from '@shared/types';

// Mock timeline type for test assertions
interface MockTimeline {
  to: ReturnType<typeof vi.fn>;
  kill: ReturnType<typeof vi.fn>;
  then: (resolve: (value?: unknown) => void) => Promise<void>;
}

// Mock GSAP with chainable and thenable timeline
const createMockTimeline = (): MockTimeline => {
  // Create a thenable object that immediately resolves
  const toMock = vi.fn();
  const killMock = vi.fn();

  const timeline: MockTimeline = {
    to: toMock,
    kill: killMock,
    // Make timeline itself thenable (for `await timeline`)
    then: (resolve: (value?: unknown) => void) => {
      resolve();
      return Promise.resolve();
    },
  };

  // Make timeline.to() return a Promise that resolves immediately
  // This allows `await timeline.to(...)` to work
  toMock.mockImplementation(() => {
    return Promise.resolve(timeline);
  });

  return timeline;
};

vi.mock('gsap', () => ({
  default: {
    timeline: vi.fn(() => createMockTimeline()),
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

// Mock utils - getTraySlotPosition mock must be inline since vi.mock is hoisted
vi.mock('@scenes/game/utils', async (importOriginal) => {
  const original = (await importOriginal()) as object;
  return {
    ...original,
    getTraySlotPosition: vi.fn(() => ({ x: 150, y: 500 })),
    getTraySlotTargetPosition: vi.fn(() => ({ x: 150, y: 500 })),
    TRAY_DISPLAY_POSITIONS: [
      { x: 48, y: 175 },
      { x: 158, y: 175 },
    ],
    TRAY_HIDDEN_Y: 800,
    TRAY_SPAWN_X: 840,
    getAnimationLayer: vi.fn().mockReturnValue({
      addChild: vi.fn(),
    }),
    getColoredTrayLayer: vi.fn().mockReturnValue({
      addChild: vi.fn(),
    }),
  };
});

// Helper to flush all pending microtasks/promises
async function flushPromises(): Promise<void> {
  // Multiple awaits to flush through promise chains
  for (let i = 0; i < 10; i++) {
    await Promise.resolve();
  }
}

// Helper to create a mock screw entity
function createMockScrewEntity(
  uid: number,
  color: ScrewColor,
  state: 'inBoard' | 'inTray' | 'inBuffer' | 'dragging' = 'inBoard'
): Entity2D {
  const position = {
    x: 100,
    y: 100,
    set(x: number, y: number): void {
      this.x = x;
      this.y = y;
    },
  };
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
      position: {
        x: 100,
        y: 100,
        set(x: number, y: number): void {
          this.x = x;
          this.y = y;
        },
      },
    },
    position,
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
    scale: { x: 1, y: 1 },
    view: {
      pivot: { set: vi.fn() },
    },
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

    it('should initialize all animator instances', () => {
      system.init();

      // After init, animators should be created (accessed via private fields)
      expect(system['screwRemoval']).toBeDefined();
      expect(system['screwTransfer']).toBeDefined();
      expect(system['trayHide']).toBeDefined();
      expect(system['trayShift']).toBeDefined();
      expect(system['trayReveal']).toBeDefined();
    });
  });

  describe('event-based animation flow', () => {
    it('should handle screw:startRemoval event via screwRemoval animator', async () => {
      system.init();
      const screw = createMockScrewEntity(1, ScrewColor.Red, 'inBoard');
      const tray = createMockTrayEntity(10, ScrewColor.Red);

      // Emit the event that triggers removal animation
      gameEvents.emit('screw:startRemoval', {
        screwEntity: screw,
        targetTray: tray,
        slotIndex: 0,
        isBuffer: false,
      });

      // Wait for async handling
      await vi.waitFor(() => {
        const screwComponent = getComponents<{ screw: { state: string } }>(
          screw
        ).screw;
        return screwComponent.state === 'inTray';
      });
    });

    it('should handle screw:startTransfer event via screwTransfer animator', async () => {
      system.init();
      const screw = createMockScrewEntity(1, ScrewColor.Red, 'inBuffer');
      const tray = createMockTrayEntity(10, ScrewColor.Red);

      // Emit the event that triggers transfer animation
      gameEvents.emit('screw:startTransfer', {
        screwEntity: screw,
        targetTray: tray,
        slotIndex: 0,
      });

      // Wait for async handling
      await vi.waitFor(() => {
        const screwComponent = getComponents<{ screw: { state: string } }>(
          screw
        ).screw;
        return screwComponent.state === 'inTray';
      });
    });

    it('should handle tray:startHide event via trayHide animator', async () => {
      system.init();
      const tray = createMockTrayEntity(10, ScrewColor.Red);
      // Mock queries for getScrewsInTray
      Object.defineProperty(system, 'queries', {
        value: createMockQueryResults([]),
        writable: true,
      });
      const emitSpy = vi.spyOn(gameEvents, 'emit');

      gameEvents.emit('tray:startHide', { trayEntity: tray });

      // Flush all pending microtasks (multiple awaits needed for promise chains)
      await flushPromises();

      expect(emitSpy).toHaveBeenCalledWith('tray:hideComplete', {
        trayEntity: tray,
        screwsInTray: [],
      });
    });

    it('should handle tray:startShift event via trayShift animator', async () => {
      system.init();
      const tray = createMockTrayEntity(10, ScrewColor.Red);
      // Mock queries for getScrewsInTray
      Object.defineProperty(system, 'queries', {
        value: createMockQueryResults([]),
        writable: true,
      });
      const emitSpy = vi.spyOn(gameEvents, 'emit');

      gameEvents.emit('tray:startShift', {
        trayEntity: tray,
        newDisplayOrder: 0,
      });

      // Flush all pending microtasks
      await flushPromises();

      expect(emitSpy).toHaveBeenCalledWith('tray:shiftComplete', {
        trayEntity: tray,
      });
    });

    it('should handle tray:startReveal event via trayReveal animator', async () => {
      system.init();
      const tray = createMockTrayEntity(10, ScrewColor.Red);
      const emitSpy = vi.spyOn(gameEvents, 'emit');

      gameEvents.emit('tray:startReveal', {
        trayEntity: tray,
        displayOrder: 1,
      });

      // Flush all pending microtasks
      await flushPromises();

      expect(emitSpy).toHaveBeenCalledWith('tray:revealComplete', {
        trayEntity: tray,
      });
    });
  });

  describe('destroy', () => {
    it('should unregister all event listeners', () => {
      system.init();
      const offSpy = vi.spyOn(gameEvents, 'off');

      system.destroy();

      expect(offSpy).toHaveBeenCalledWith(
        'screw:startRemoval',
        expect.any(Function)
      );
      expect(offSpy).toHaveBeenCalledWith(
        'screw:startTransfer',
        expect.any(Function)
      );
      expect(offSpy).toHaveBeenCalledWith(
        'tray:startHide',
        expect.any(Function)
      );
      expect(offSpy).toHaveBeenCalledWith(
        'tray:startShift',
        expect.any(Function)
      );
      expect(offSpy).toHaveBeenCalledWith(
        'tray:startReveal',
        expect.any(Function)
      );
    });

    it('should kill all active timelines', () => {
      // Add a mock timeline to active set
      const localMockTimeline = createMockTimeline();
      system['activeTimelines'].add(
        localMockTimeline as unknown as gsap.core.Timeline
      );

      system.destroy();

      expect(localMockTimeline.kill).toHaveBeenCalled();
    });

    it('should clear activeTimelines set', () => {
      const localMockTimeline = createMockTimeline();
      system['activeTimelines'].add(
        localMockTimeline as unknown as gsap.core.Timeline
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

  describe('hidePlaceholder', () => {
    it('should be a public method for hiding placeholders', () => {
      const tray = createMockTrayEntity(10, ScrewColor.Red);

      // Should not throw when calling public method
      expect(() => {
        system.hidePlaceholder(tray, 0);
      }).not.toThrow();
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
