import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { PhysicsWorldManager, PHYSICS_CONFIG } from '@physics';

describe('Physics Interpolation Debug', () => {
  let physics: PhysicsWorldManager;

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

  it('detailed frame-by-frame analysis at 120Hz', () => {
    const entity = createMockEntity(100, 100);
    const bodyId = physics.createBodyForPart(entity as never, 50, 50, false, 1);

    console.log('\n=== Frame-by-frame 120Hz simulation ===');
    console.log('Fixed timestep:', String(PHYSICS_CONFIG.fixedTimestep), 'ms');
    console.log('Render frame time: 8.33ms (120Hz)');
    console.log('');

    for (let i = 0; i < 8; i++) {
      console.log('--- FRAME ' + String(i) + ' ---');

      // Get state BEFORE step
      const beforeCurrent = physics.getBodyPosition(bodyId);
      const beforeAlpha = physics.getInterpolationAlpha();
      console.log(
        '  Before step: currentY=' +
          beforeCurrent!.y.toFixed(3) +
          ', alpha=' +
          beforeAlpha.toFixed(3)
      );

      // Step
      physics.step(8.33);

      // Get state AFTER step
      const afterCurrent = physics.getBodyPosition(bodyId);
      const afterAlpha = physics.getInterpolationAlpha();
      console.log(
        '  After step:  currentY=' +
          afterCurrent!.y.toFixed(3) +
          ', alpha=' +
          afterAlpha.toFixed(3)
      );

      // Get interpolated
      const interpolated = physics.getBodyPositionInterpolated(
        bodyId,
        afterAlpha
      );
      console.log('  Interpolated: y=' + interpolated!.y.toFixed(3));

      // Did physics step this frame?
      const physicsSteppedThisFrame = afterCurrent!.y !== beforeCurrent!.y;
      console.log('  Physics stepped: ' + String(physicsSteppedThisFrame));
      console.log('');
    }
  });

  it('shows the problem: first frames have no interpolation', () => {
    const entity = createMockEntity(100, 100);
    const bodyId = physics.createBodyForPart(entity as never, 50, 50, false, 1);

    // First render frame (8.33ms)
    physics.step(8.33);
    const alpha1 = physics.getInterpolationAlpha();
    const pos1 = physics.getBodyPositionInterpolated(bodyId, alpha1);

    // Second render frame (8.33ms more = 16.66ms total)
    physics.step(8.33);
    const alpha2 = physics.getInterpolationAlpha();
    const pos2 = physics.getBodyPositionInterpolated(bodyId, alpha2);

    console.log('\n=== First two frames ===');
    console.log(`Frame 1: alpha=${alpha1.toFixed(3)}, y=${pos1!.y.toFixed(3)}`);
    console.log(`Frame 2: alpha=${alpha2.toFixed(3)}, y=${pos2!.y.toFixed(3)}`);
    console.log(
      `Y difference: ${(pos2!.y - pos1!.y).toFixed(3)} (should be non-zero for smooth motion)`
    );

    // The problem: these might be the same because no snapshot existed initially
  });

  it('confirms interpolation works AFTER first physics step', () => {
    const entity = createMockEntity(100, 100);
    const bodyId = physics.createBodyForPart(entity as never, 50, 50, false, 1);

    // Warm up: do one full physics step first
    physics.step(PHYSICS_CONFIG.fixedTimestep);
    console.log(
      '\n=== After warmup step, accumulator=',
      physics.getInterpolationAlpha()
    );

    const positions: number[] = [];

    // Now simulate 4 frames at 120Hz
    for (let i = 0; i < 4; i++) {
      physics.step(8.33);
      const alpha = physics.getInterpolationAlpha();
      const pos = physics.getBodyPositionInterpolated(bodyId, alpha);
      positions.push(pos!.y);
      console.log(
        'Frame ' +
          String(i) +
          ': alpha=' +
          alpha.toFixed(3) +
          ', y=' +
          pos!.y.toFixed(3)
      );
    }

    // After warmup, all consecutive frames should have different Y values
    for (let i = 1; i < positions.length; i++) {
      const curr = positions[i]!;
      const prev = positions[i - 1]!;
      const diff = curr - prev;
      console.log(
        'Y diff frame ' +
          String(i - 1) +
          ' to ' +
          String(i) +
          ': ' +
          diff.toFixed(4)
      );
      expect(diff).toBeGreaterThan(0); // Each frame should show progress
    }
  });
});
