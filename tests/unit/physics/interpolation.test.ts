import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { PhysicsWorldManager, PHYSICS_CONFIG } from '@physics';

describe('Physics Interpolation', () => {
  let physics: PhysicsWorldManager;

  // Mock entity with position
  const createMockEntity = (
    x: number,
    y: number
  ): { position: { x: number; y: number }; UID: number } => ({
    position: { x, y },
    UID: Math.random() * 1000,
  });

  beforeEach(() => {
    PhysicsWorldManager.destroy();
    physics = PhysicsWorldManager.getInstance();
  });

  afterEach(() => {
    PhysicsWorldManager.destroy();
  });

  describe('snapshot capture timing', () => {
    it('should NOT have snapshot before any physics step', () => {
      const entity = createMockEntity(100, 100);
      const bodyId = physics.createBodyForPart(
        entity as never,
        50,
        50,
        false,
        1
      );

      // Step less than one physics frame - no physics step should occur
      physics.step(8); // 8ms < 16.67ms fixedTimestep

      // Without a physics step, interpolated position should use current (no snapshot)
      const pos = physics.getBodyPositionInterpolated(bodyId, 0.5);
      expect(pos).not.toBeNull();

      // Get current position directly
      const currentPos = physics.getBodyPosition(bodyId);

      // Since no snapshot exists yet, interpolated should equal current
      expect(pos!.x).toBeCloseTo(currentPos!.x, 1);
      expect(pos!.y).toBeCloseTo(currentPos!.y, 1);
    });

    it('should have snapshot AFTER physics step occurs', () => {
      const entity = createMockEntity(100, 100);
      const bodyId = physics.createBodyForPart(
        entity as never,
        50,
        50,
        false,
        1
      );

      // Step enough for one physics step
      physics.step(PHYSICS_CONFIG.fixedTimestep);

      // Now a snapshot should exist
      const pos = physics.getBodyPositionInterpolated(bodyId, 0);
      expect(pos).not.toBeNull();
    });

    it('snapshot should represent state BEFORE physics step', () => {
      const entity = createMockEntity(100, 100);
      const bodyId = physics.createBodyForPart(
        entity as never,
        50,
        50,
        false,
        1
      );

      // Get initial position
      const initialPos = physics.getBodyPosition(bodyId);
      console.log('Initial position:', initialPos);

      // Step exactly one physics frame
      physics.step(PHYSICS_CONFIG.fixedTimestep);

      // Get position after step
      const afterStepPos = physics.getBodyPosition(bodyId);
      console.log('After step position:', afterStepPos);

      // Body should have moved due to gravity
      expect(afterStepPos!.y).toBeGreaterThan(initialPos!.y);

      // Interpolate at alpha=0 should give snapshot position (before step)
      const interpAt0 = physics.getBodyPositionInterpolated(bodyId, 0);
      console.log('Interpolated at alpha=0:', interpAt0);

      // Interpolate at alpha=1 should give current position (after step)
      const interpAt1 = physics.getBodyPositionInterpolated(bodyId, 1);
      console.log('Interpolated at alpha=1:', interpAt1);

      // At alpha=0, should be close to initial position
      expect(interpAt0!.y).toBeCloseTo(initialPos!.y, 0);

      // At alpha=1, should be close to current position
      expect(interpAt1!.y).toBeCloseTo(afterStepPos!.y, 0);
    });
  });

  describe('interpolation between frames', () => {
    it('should interpolate smoothly between physics steps', () => {
      const entity = createMockEntity(100, 100);
      const bodyId = physics.createBodyForPart(
        entity as never,
        50,
        50,
        false,
        1
      );

      // Step one full physics frame to establish snapshot
      physics.step(PHYSICS_CONFIG.fixedTimestep);

      const posAfterFirstStep = physics.getBodyPosition(bodyId);
      console.log('Position after first step:', posAfterFirstStep);

      // Step another full frame
      physics.step(PHYSICS_CONFIG.fixedTimestep);

      const posAfterSecondStep = physics.getBodyPosition(bodyId);
      console.log('Position after second step:', posAfterSecondStep);

      // Now test interpolation at various alphas
      const at0 = physics.getBodyPositionInterpolated(bodyId, 0);
      const at05 = physics.getBodyPositionInterpolated(bodyId, 0.5);
      const at1 = physics.getBodyPositionInterpolated(bodyId, 1);

      console.log('Interpolated at 0:', at0);
      console.log('Interpolated at 0.5:', at05);
      console.log('Interpolated at 1:', at1);

      // Alpha=0 should be previous position (after first step)
      expect(at0!.y).toBeCloseTo(posAfterFirstStep!.y, 0);

      // Alpha=1 should be current position (after second step)
      expect(at1!.y).toBeCloseTo(posAfterSecondStep!.y, 0);

      // Alpha=0.5 should be between them
      expect(at05!.y).toBeGreaterThan(at0!.y);
      expect(at05!.y).toBeLessThan(at1!.y);
    });

    it('should return correct alpha based on accumulator', () => {
      const entity = createMockEntity(100, 100);
      physics.createBodyForPart(entity as never, 50, 50, false, 1);

      // Step 8ms - less than one physics frame (16.67ms)
      physics.step(8);

      const alpha = physics.getInterpolationAlpha();
      console.log('Alpha after 8ms step:', alpha);

      // Alpha should be ~0.48 (8 / 16.67)
      expect(alpha).toBeCloseTo(8 / PHYSICS_CONFIG.fixedTimestep, 1);
    });

    it('accumulator should reset after physics step', () => {
      const entity = createMockEntity(100, 100);
      physics.createBodyForPart(entity as never, 50, 50, false, 1);

      // Step exactly one physics frame
      physics.step(PHYSICS_CONFIG.fixedTimestep);

      const alphaAfterFullStep = physics.getInterpolationAlpha();
      console.log('Alpha after full step:', alphaAfterFullStep);

      // Accumulator should be ~0 after a full step
      expect(alphaAfterFullStep).toBeCloseTo(0, 1);
    });
  });

  describe('120Hz simulation', () => {
    it('should provide smooth positions at 120Hz render rate', () => {
      const entity = createMockEntity(100, 100);
      const bodyId = physics.createBodyForPart(
        entity as never,
        50,
        50,
        false,
        1
      );

      const positions: number[] = [];

      // Simulate 10 frames at 120Hz (8.33ms per frame)
      // Physics runs at 60Hz (16.67ms), so every 2 render frames = 1 physics step
      for (let i = 0; i < 10; i++) {
        physics.step(8.33);
        const alpha = physics.getInterpolationAlpha();
        const pos = physics.getBodyPositionInterpolated(bodyId, alpha);
        positions.push(pos!.y);
        console.log(
          'Frame ' +
            String(i) +
            ': alpha=' +
            alpha.toFixed(2) +
            ', y=' +
            pos!.y.toFixed(2)
        );
      }

      // Positions should be monotonically increasing (falling due to gravity)
      for (let i = 1; i < positions.length; i++) {
        expect(positions[i]!).toBeGreaterThanOrEqual(positions[i - 1]!);
      }

      // Check that we have variation (not all same position)
      const uniquePositions = new Set(positions.map((p) => p.toFixed(1)));
      console.log('Unique Y positions:', uniquePositions.size);
      expect(uniquePositions.size).toBeGreaterThan(1);
    });
  });
});
