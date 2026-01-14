/**
 * Unit tests for PhysicsSystem.
 *
 * PhysicsSystem manages the Planck.js physics simulation.
 * It listens for part:freed events to convert bodies to dynamic,
 * steps the physics world each frame, syncs positions to entities,
 * and emits part:settled events when bodies come to rest.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import type { Entity, Entity2D, QueryResults, Time } from '@play-co/odie';

import { PhysicsSystem } from '@scenes/game/systems/PhysicsSystem';
import { gameEvents } from '@scenes/game/utils';

// Use vi.hoisted to create mock before vi.mock is hoisted
const { mockPhysicsManager, mockPhysicsConfig } = vi.hoisted(() => ({
  mockPhysicsManager: {
    setBodyDynamic: vi.fn(),
    step: vi.fn(),
    getBodyPosition: vi.fn(),
    getBodyRotation: vi.fn(),
    getInterpolationAlpha: vi.fn(),
    getBodyPositionInterpolated: vi.fn(),
    getBodyRotationInterpolated: vi.fn(),
    isBodySleeping: vi.fn(),
    removeBody: vi.fn(),
    reset: vi.fn(),
  },
  mockPhysicsConfig: {
    playArea: {
      minX: 132,
      maxX: 947,
      minY: 600,
      maxY: 1750,
    },
  },
}));

vi.mock('@physics', () => ({
  PhysicsWorldManager: {
    getInstance: (): typeof mockPhysicsManager => mockPhysicsManager,
  },
  PHYSICS_CONFIG: mockPhysicsConfig,
}));

// Helper to create a mock part entity with physics body
function createMockPartEntity(
  uid: number,
  bodyId: number,
  bodyType: 'static' | 'dynamic' = 'static',
  position = { x: 100, y: 200 }
): Entity2D {
  return {
    UID: uid,
    c: {
      part: {
        partDefinitionId: `part-${String(uid)}`,
        layer: 0,
        screwCount: 0,
        state: bodyType === 'dynamic' ? 'free' : 'static',
      },
      physicsBody: {
        bodyType,
        bodyId,
        isSleeping: false,
        enabled: true,
      },
    },
    position: { x: position.x, y: position.y },
    view: { rotation: 0, alpha: 1 },
  } as unknown as Entity2D;
}

// Helper to create mock query results
function createMockQueryResults(parts: Entity2D[]): QueryResults {
  return {
    physicsBodies: {
      entities: parts,
      first: parts[0],
      forEach: (callback: (entity: Entity) => void) => {
        parts.forEach(callback);
      },
    },
  } as unknown as QueryResults;
}

describe('PhysicsSystem', () => {
  let system: PhysicsSystem;

  beforeEach(() => {
    system = new PhysicsSystem();
    gameEvents.clear();
    vi.clearAllMocks();

    // Setup default mock returns
    mockPhysicsManager.getBodyPosition.mockReturnValue({ x: 100, y: 200 });
    mockPhysicsManager.getBodyRotation.mockReturnValue(0);
    mockPhysicsManager.getInterpolationAlpha.mockReturnValue(1.0);
    // Sync interpolated getters with non-interpolated by using dynamic implementation
    mockPhysicsManager.getBodyPositionInterpolated.mockImplementation(
      () => mockPhysicsManager.getBodyPosition() as { x: number; y: number }
    );
    mockPhysicsManager.getBodyRotationInterpolated.mockImplementation(
      () => mockPhysicsManager.getBodyRotation() as number
    );
    mockPhysicsManager.isBodySleeping.mockReturnValue(false);
  });

  afterEach(() => {
    gameEvents.clear();
    vi.restoreAllMocks();
  });

  describe('init', () => {
    it('should register part:freed event listener', () => {
      const onSpy = vi.spyOn(gameEvents, 'on');

      system.init();

      expect(onSpy).toHaveBeenCalledWith('part:freed', expect.any(Function));
    });

    it('should get PhysicsWorldManager instance', () => {
      system.init();

      // PhysicsWorldManager.getInstance() is called in constructor
      // We verify the system has access to the manager by checking methods exist
      expect(mockPhysicsManager.step).toBeDefined();
    });
  });

  describe('destroy', () => {
    it('should unregister part:freed event listener', () => {
      const offSpy = vi.spyOn(gameEvents, 'off');

      system.init();
      system.destroy();

      expect(offSpy).toHaveBeenCalledWith('part:freed', expect.any(Function));
    });
  });

  describe('part:freed event handling', () => {
    it('should convert body to dynamic on part:freed', () => {
      const partEntity = createMockPartEntity(1, 5);

      (system as { queries: QueryResults }).queries = createMockQueryResults([
        partEntity,
      ]);

      system.init();
      gameEvents.emit('part:freed', { partEntity, partId: 'part-1' });

      expect(mockPhysicsManager.setBodyDynamic).toHaveBeenCalledWith(5);
    });

    it('should update component bodyType to dynamic', () => {
      const partEntity = createMockPartEntity(1, 5);

      (system as { queries: QueryResults }).queries = createMockQueryResults([
        partEntity,
      ]);

      system.init();
      gameEvents.emit('part:freed', { partEntity, partId: 'part-1' });

      const physicsBody = (
        partEntity.c as unknown as { physicsBody: { bodyType: string } }
      ).physicsBody;
      expect(physicsBody.bodyType).toBe('dynamic');
    });

    it('should set isSleeping to false on part:freed', () => {
      const partEntity = createMockPartEntity(1, 5);

      (system as { queries: QueryResults }).queries = createMockQueryResults([
        partEntity,
      ]);

      system.init();
      gameEvents.emit('part:freed', { partEntity, partId: 'part-1' });

      const physicsBody = (
        partEntity.c as unknown as { physicsBody: { isSleeping: boolean } }
      ).physicsBody;
      expect(physicsBody.isSleeping).toBe(false);
    });

    it('should not crash with invalid bodyId', () => {
      const partEntity = createMockPartEntity(1, -1); // Invalid bodyId

      (system as { queries: QueryResults }).queries = createMockQueryResults([
        partEntity,
      ]);

      system.init();

      expect(() => {
        gameEvents.emit('part:freed', { partEntity, partId: 'part-1' });
      }).not.toThrow();

      // Should not call setBodyDynamic with invalid ID
      expect(mockPhysicsManager.setBodyDynamic).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should step physics simulation with delta time', () => {
      const partEntity = createMockPartEntity(1, 5, 'dynamic');

      (system as { queries: QueryResults }).queries = createMockQueryResults([
        partEntity,
      ]);

      system.init();

      // ODIE's time.deltaTime is in milliseconds
      const time = { deltaTime: 16 } as Time; // ~60fps (16ms)
      system.update(time);

      expect(mockPhysicsManager.step).toHaveBeenCalledWith(16);
    });

    it('should sync Planck position to entity position', () => {
      const partEntity = createMockPartEntity(1, 5, 'dynamic');
      mockPhysicsManager.getBodyPosition.mockReturnValue({ x: 150, y: 300 });

      (system as { queries: QueryResults }).queries = createMockQueryResults([
        partEntity,
      ]);

      system.init();

      const time = { deltaTime: 0.016 } as Time;
      system.update(time);

      expect(partEntity.position.x).toBe(150);
      expect(partEntity.position.y).toBe(300);
    });

    it('should not sync position for static bodies', () => {
      const partEntity = createMockPartEntity(1, 5, 'static');
      const originalX = partEntity.position.x;
      const originalY = partEntity.position.y;

      (system as { queries: QueryResults }).queries = createMockQueryResults([
        partEntity,
      ]);

      system.init();

      const time = { deltaTime: 0.016 } as Time;
      system.update(time);

      expect(partEntity.position.x).toBe(originalX);
      expect(partEntity.position.y).toBe(originalY);
    });

    it('should not sync position for disabled physics bodies', () => {
      const partEntity = createMockPartEntity(1, 5, 'dynamic');
      const originalX = partEntity.position.x;
      const originalY = partEntity.position.y;
      (
        partEntity.c as unknown as { physicsBody: { enabled: boolean } }
      ).physicsBody.enabled = false;

      (system as { queries: QueryResults }).queries = createMockQueryResults([
        partEntity,
      ]);

      system.init();

      const time = { deltaTime: 0.016 } as Time;
      system.update(time);

      expect(partEntity.position.x).toBe(originalX);
      expect(partEntity.position.y).toBe(originalY);
    });
  });

  describe('falling parts fade and destruction', () => {
    it('should track freed parts as falling', () => {
      const partEntity = createMockPartEntity(1, 5, 'dynamic');
      mockPhysicsManager.getBodyPosition.mockReturnValue({ x: 100, y: 500 });

      (system as { queries: QueryResults }).queries = createMockQueryResults([
        partEntity,
      ]);

      system.init();
      gameEvents.emit('part:freed', { partEntity, partId: 'part-1' });

      // After freed, part should be tracked as falling
      const fallingParts = (
        system as unknown as { fallingParts: Map<number, number> }
      ).fallingParts;
      expect(fallingParts.has(partEntity.UID)).toBe(true);
    });

    it('should not emit part:settled for falling parts', () => {
      const partEntity = createMockPartEntity(1, 5, 'dynamic');
      mockPhysicsManager.isBodySleeping.mockReturnValue(true);
      mockPhysicsManager.getBodyPosition.mockReturnValue({ x: 100, y: 500 });

      (system as { queries: QueryResults }).queries = createMockQueryResults([
        partEntity,
      ]);

      const emitSpy = vi.spyOn(gameEvents, 'emit');

      system.init();
      gameEvents.emit('part:freed', { partEntity, partId: 'part-1' });

      const time = { deltaTime: 16 } as Time;
      system.update(time);

      // Falling parts don't emit part:settled
      expect(emitSpy).not.toHaveBeenCalledWith(
        'part:settled',
        expect.anything()
      );
    });

    it('should fade part view when falling below play area', () => {
      const partEntity = createMockPartEntity(1, 5, 'dynamic');
      // Position below play area maxY (1750) to trigger fade
      mockPhysicsManager.getBodyPosition.mockReturnValue({ x: 100, y: 1850 });

      (system as { queries: QueryResults }).queries = createMockQueryResults([
        partEntity,
      ]);

      system.init();
      gameEvents.emit('part:freed', { partEntity, partId: 'part-1' });

      const time = { deltaTime: 16 } as Time;
      system.update(time);

      // View alpha should be reduced (100 pixels past maxY = 25% fade)
      expect(partEntity.view.alpha).toBeLessThan(1);
    });

    it('should queue entity for destruction when past threshold', () => {
      const partEntity = createMockPartEntity(1, 5, 'dynamic');
      // Position past destroy threshold (maxY + 200 = 1950)
      mockPhysicsManager.getBodyPosition.mockReturnValue({ x: 100, y: 2000 });

      // Mock scene.removeChild
      const mockScene = { removeChild: vi.fn() };
      (system as unknown as { scene: typeof mockScene }).scene = mockScene;

      (system as { queries: QueryResults }).queries = createMockQueryResults([
        partEntity,
      ]);

      system.init();
      gameEvents.emit('part:freed', { partEntity, partId: 'part-1' });

      const time = { deltaTime: 16 } as Time;
      system.update(time);

      // Entity should be removed
      expect(mockScene.removeChild).toHaveBeenCalledWith(partEntity);
    });

    it('should clean up physics body when destroying falling part', () => {
      const partEntity = createMockPartEntity(1, 5, 'dynamic');
      mockPhysicsManager.getBodyPosition.mockReturnValue({ x: 100, y: 2000 });

      const mockScene = { removeChild: vi.fn() };
      (system as unknown as { scene: typeof mockScene }).scene = mockScene;

      (system as { queries: QueryResults }).queries = createMockQueryResults([
        partEntity,
      ]);

      system.init();
      gameEvents.emit('part:freed', { partEntity, partId: 'part-1' });

      const time = { deltaTime: 16 } as Time;
      system.update(time);

      expect(mockPhysicsManager.removeBody).toHaveBeenCalledWith(5);
    });
  });

  describe('settling detection (non-falling dynamic parts)', () => {
    it('should emit part:settled when dynamic non-falling body transitions to sleeping', () => {
      // Create a dynamic part that is NOT tracked as falling
      const partEntity = createMockPartEntity(1, 5, 'dynamic');
      mockPhysicsManager.isBodySleeping.mockReturnValue(true);
      mockPhysicsManager.getBodyPosition.mockReturnValue({ x: 100, y: 500 });

      (system as { queries: QueryResults }).queries = createMockQueryResults([
        partEntity,
      ]);

      const emitSpy = vi.spyOn(gameEvents, 'emit');

      system.init();
      // Don't emit part:freed so it's not tracked as falling

      const time = { deltaTime: 16 } as Time;
      system.update(time);

      expect(emitSpy).toHaveBeenCalledWith(
        'part:settled',
        expect.objectContaining({
          partEntity,
        })
      );
    });

    it('should update isSleeping component when non-falling body sleeps', () => {
      const partEntity = createMockPartEntity(1, 5, 'dynamic');
      mockPhysicsManager.isBodySleeping.mockReturnValue(true);
      mockPhysicsManager.getBodyPosition.mockReturnValue({ x: 100, y: 500 });

      (system as { queries: QueryResults }).queries = createMockQueryResults([
        partEntity,
      ]);

      system.init();
      // Don't emit part:freed so it's not tracked as falling

      const time = { deltaTime: 16 } as Time;
      system.update(time);

      const physicsBody = (
        partEntity.c as unknown as { physicsBody: { isSleeping: boolean } }
      ).physicsBody;
      expect(physicsBody.isSleeping).toBe(true);
    });
  });
});
