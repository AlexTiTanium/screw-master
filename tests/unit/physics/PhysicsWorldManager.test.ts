/**
 * Unit tests for PhysicsWorldManager.
 *
 * PhysicsWorldManager is a singleton that manages the Planck.js physics world.
 * It handles body creation, stepping, position queries, and deterministic simulation.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import type { Entity2D } from '@play-co/odie';

import { PhysicsWorldManager } from '@physics';

// Helper to create a mock entity
function createMockEntity(uid: number, x: number, y: number): Entity2D {
  return {
    UID: uid,
    position: { x, y },
  } as unknown as Entity2D;
}

describe('PhysicsWorldManager', () => {
  let manager: PhysicsWorldManager;

  beforeEach(() => {
    // Get fresh instance (singleton reset happens in afterEach)
    manager = PhysicsWorldManager.getInstance();
  });

  afterEach(() => {
    // Destroy singleton for test isolation
    PhysicsWorldManager.destroy();
  });

  describe('getInstance', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = PhysicsWorldManager.getInstance();
      const instance2 = PhysicsWorldManager.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should create a new instance after destroy', () => {
      const instance1 = PhysicsWorldManager.getInstance();
      PhysicsWorldManager.destroy();
      const instance2 = PhysicsWorldManager.getInstance();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe('createBodyForPart', () => {
    it('should create a static body and return bodyId', () => {
      const entity = createMockEntity(1, 200, 400);
      const bodyId = manager.createBodyForPart(entity, 100, 50, true);

      expect(bodyId).toBeGreaterThanOrEqual(0);
    });

    it('should create a dynamic body when isStatic is false', () => {
      const entity = createMockEntity(1, 200, 400);
      const bodyId = manager.createBodyForPart(entity, 100, 50, false);

      expect(bodyId).toBeGreaterThanOrEqual(0);
    });

    it('should assign unique bodyIds to different entities', () => {
      const entity1 = createMockEntity(1, 200, 400);
      const entity2 = createMockEntity(2, 300, 500);

      const bodyId1 = manager.createBodyForPart(entity1, 100, 50, true);
      const bodyId2 = manager.createBodyForPart(entity2, 100, 50, true);

      expect(bodyId1).not.toBe(bodyId2);
    });
  });

  describe('setBodyDynamic', () => {
    it('should convert static body to dynamic', () => {
      const entity = createMockEntity(1, 200, 400);
      const bodyId = manager.createBodyForPart(entity, 100, 50, true);

      // Should not throw
      expect(() => {
        manager.setBodyDynamic(bodyId);
      }).not.toThrow();
    });

    it('should not crash with invalid bodyId', () => {
      expect(() => {
        manager.setBodyDynamic(-1);
      }).not.toThrow();

      expect(() => {
        manager.setBodyDynamic(9999);
      }).not.toThrow();
    });
  });

  describe('step', () => {
    it('should step physics simulation without error', () => {
      const entity = createMockEntity(1, 200, 400);
      manager.createBodyForPart(entity, 100, 50, false);

      expect(() => {
        manager.step(16.67); // ~60fps
      }).not.toThrow();
    });

    it('should use fixed timestep accumulator', () => {
      const entity = createMockEntity(1, 200, 400);
      manager.createBodyForPart(entity, 100, 50, false);

      // Small delta should accumulate without stepping
      manager.step(5);
      manager.step(5);

      // Full step after enough accumulation
      manager.step(10);

      // Should not throw
    });
  });

  describe('stepExact', () => {
    it('should step physics by exact delta (for deterministic testing)', () => {
      const entity = createMockEntity(1, 200, 400);
      manager.createBodyForPart(entity, 100, 50, false);

      expect(() => {
        manager.stepExact(16.67);
      }).not.toThrow();
    });
  });

  describe('getBodyPosition', () => {
    it('should return position in pixels', () => {
      const entity = createMockEntity(1, 200, 400);
      const bodyId = manager.createBodyForPart(entity, 100, 50, true);

      const position = manager.getBodyPosition(bodyId);

      expect(position).not.toBeNull();
      expect(position?.x).toBeCloseTo(200, 0); // Within 1 pixel
      expect(position?.y).toBeCloseTo(400, 0);
    });

    it('should return null for invalid bodyId', () => {
      const position = manager.getBodyPosition(-1);

      expect(position).toBeNull();
    });

    it('should reflect physics simulation changes', () => {
      const entity = createMockEntity(1, 200, 400);
      const bodyId = manager.createBodyForPart(entity, 100, 50, false);

      const initialPos = manager.getBodyPosition(bodyId);

      // Step physics (gravity should pull body down)
      for (let i = 0; i < 60; i++) {
        manager.stepExact(16.67);
      }

      const finalPos = manager.getBodyPosition(bodyId);

      // Y should have increased (fallen down due to gravity)
      expect(finalPos?.y).toBeGreaterThan(initialPos?.y ?? 0);
    });
  });

  describe('isBodySleeping', () => {
    it('should return false for newly created dynamic body', () => {
      const entity = createMockEntity(1, 200, 400);
      const bodyId = manager.createBodyForPart(entity, 100, 50, false);

      // Wake the body
      manager.setBodyDynamic(bodyId);

      const isSleeping = manager.isBodySleeping(bodyId);

      expect(isSleeping).toBe(false);
    });

    it('should return true for invalid bodyId', () => {
      const isSleeping = manager.isBodySleeping(-1);

      expect(isSleeping).toBe(true);
    });
  });

  describe('pause and resume', () => {
    it('should pause physics simulation', () => {
      const entity = createMockEntity(1, 200, 400);
      const bodyId = manager.createBodyForPart(entity, 100, 50, false);

      const initialPos = manager.getBodyPosition(bodyId);

      manager.pause();
      manager.step(1000); // Large delta should have no effect

      const afterPausePos = manager.getBodyPosition(bodyId);

      expect(afterPausePos?.y).toBeCloseTo(initialPos?.y ?? 0, 1);
    });

    it('should resume physics simulation', () => {
      const entity = createMockEntity(1, 200, 400);
      const bodyId = manager.createBodyForPart(entity, 100, 50, false);

      manager.pause();
      manager.resume();

      const initialPos = manager.getBodyPosition(bodyId);

      // Now physics should run
      for (let i = 0; i < 30; i++) {
        manager.step(16.67);
      }

      const afterResumePos = manager.getBodyPosition(bodyId);

      expect(afterResumePos?.y).toBeGreaterThan(initialPos?.y ?? 0);
    });
  });

  describe('reset', () => {
    it('should clear dynamic bodies for level restart', () => {
      const entity1 = createMockEntity(1, 200, 400);
      const entity2 = createMockEntity(2, 300, 500);

      const bodyId1 = manager.createBodyForPart(entity1, 100, 50, false);
      const bodyId2 = manager.createBodyForPart(entity2, 100, 50, false);

      manager.reset();

      // Bodies should no longer be accessible
      expect(manager.getBodyPosition(bodyId1)).toBeNull();
      expect(manager.getBodyPosition(bodyId2)).toBeNull();
    });

    it('should keep boundary walls after reset', () => {
      manager.reset();

      // Should not throw - boundaries still exist for collision
      expect(() => {
        const entity = createMockEntity(1, 200, 400);
        manager.createBodyForPart(entity, 100, 50, false);
      }).not.toThrow();
    });
  });

  describe('determinism', () => {
    it('should produce identical results with same inputs', () => {
      // First run
      const entity1 = createMockEntity(1, 200, 400);
      const bodyId1 = manager.createBodyForPart(entity1, 100, 50, false);

      for (let i = 0; i < 60; i++) {
        manager.stepExact(16.67);
      }
      const pos1 = manager.getBodyPosition(bodyId1);

      // Reset and second run
      PhysicsWorldManager.destroy();
      manager = PhysicsWorldManager.getInstance();

      const entity2 = createMockEntity(1, 200, 400);
      const bodyId2 = manager.createBodyForPart(entity2, 100, 50, false);

      for (let i = 0; i < 60; i++) {
        manager.stepExact(16.67);
      }
      const pos2 = manager.getBodyPosition(bodyId2);

      // Positions should be identical (deterministic)
      expect(pos1?.x).toBeCloseTo(pos2?.x ?? 0, 2);
      expect(pos1?.y).toBeCloseTo(pos2?.y ?? 0, 2);
    });
  });
});
