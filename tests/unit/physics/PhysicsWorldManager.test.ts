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

  describe('interpolation alpha', () => {
    it('should return alpha between 0 and 1', () => {
      const alpha = manager.getInterpolationAlpha();

      expect(alpha).toBeGreaterThanOrEqual(0);
      expect(alpha).toBeLessThanOrEqual(1);
    });

    it('should increase alpha as accumulator fills between physics steps', () => {
      // At 120Hz display (8.33ms frames) with 60Hz physics (16.67ms timestep)
      // Physics steps every ~2 frames:
      // - Frame 1: accumulator = 8.33ms, alpha ≈ 0.5
      // - Frame 2: accumulator = 16.66ms (< 16.67ms), alpha ≈ 1.0 (no step yet)
      // - Frame 3: accumulator = 25ms → step → leftover = 8.33ms, alpha ≈ 0.5

      // Start fresh
      manager.reset();

      // First small step - partial accumulator
      manager.step(8);
      const alpha1 = manager.getInterpolationAlpha();

      // Alpha should be close to 8/16.67 ≈ 0.48
      expect(alpha1).toBeGreaterThan(0.4);
      expect(alpha1).toBeLessThan(0.6);

      // Second small step - still not enough to trigger physics step
      // 16ms < 16.67ms, so no step yet
      manager.step(8);
      const alpha2 = manager.getInterpolationAlpha();

      // Alpha should be close to 16/16.67 ≈ 0.96
      expect(alpha2).toBeGreaterThan(0.9);
      expect(alpha2).toBeLessThan(1.0);

      // Third step - now triggers physics step (24ms > 16.67ms)
      manager.step(8);
      const alpha3 = manager.getInterpolationAlpha();

      // After physics step, accumulator = 24 - 16.67 = 7.33ms
      // Alpha should be ~7.33/16.67 ≈ 0.44
      expect(alpha3).toBeGreaterThan(0.3);
      expect(alpha3).toBeLessThan(0.6);
    });

    it('should oscillate in expected range on 120Hz display with 60Hz physics', () => {
      // At 120Hz display (8.33ms frames) with 60Hz physics (16.67ms timestep)
      // Physics steps every ~2 frames, so alpha oscillates:
      // - After frame: alpha ≈ 0.5
      // - After next frame: alpha ≈ 1.0 → physics steps → leftover ≈ 0.5
      // Pattern: 0.5 → 1.0 → 0.5 → 1.0 → ...
      manager.reset();

      const alphas: number[] = [];

      // Simulate 120 frames at ~8.33ms each (1 second at 120Hz)
      for (let i = 0; i < 120; i++) {
        manager.step(8.33);
        alphas.push(manager.getInterpolationAlpha());
      }

      // Check that alpha stayed in reasonable range [0, 1]
      const maxAlpha = Math.max(...alphas);
      const minAlpha = Math.min(...alphas);

      // Alpha should stay in [0, 1]
      expect(maxAlpha).toBeLessThanOrEqual(1.0);
      expect(minAlpha).toBeGreaterThanOrEqual(0);

      // Verify the oscillating pattern - we should see both low and high values
      const lowCount = alphas.filter((a) => a < 0.6).length;
      const highCount = alphas.filter((a) => a >= 0.6).length;

      // Both low and high alpha values should occur (oscillating pattern)
      expect(lowCount).toBeGreaterThan(0);
      expect(highCount).toBeGreaterThan(0);
    });

    it('should handle variable frame times without alpha exceeding 1', () => {
      manager.reset();

      const alphas: number[] = [];

      // Simulate variable frame times (common in real browsers)
      const frameTimes = [8, 9, 7, 10, 8, 12, 6, 9, 8, 11, 7, 8];

      for (const dt of frameTimes) {
        manager.step(dt);
        alphas.push(manager.getInterpolationAlpha());
      }

      // Alpha should never exceed 1
      const maxAlpha = Math.max(...alphas);
      expect(maxAlpha).toBeLessThanOrEqual(1);
    });

    it('should capture alpha for debug display', () => {
      manager.reset();
      manager.step(10);

      const captured = manager.captureAlphaForDebug();
      const retrieved = manager.getCapturedAlpha();

      expect(captured).toBe(retrieved);
      expect(captured).toBeGreaterThan(0);
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
