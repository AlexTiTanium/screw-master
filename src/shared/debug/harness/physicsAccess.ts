/**
 * Physics Access Implementation
 *
 * Provides test harness access to the Planck.js physics world
 * for deterministic E2E testing.
 *
 * @module
 */

import { PhysicsWorldManager } from '@physics';

import type { PhysicsAccess } from '../types';

/**
 * Creates a PhysicsAccess implementation for the test harness.
 *
 * @returns PhysicsAccess interface for physics control and inspection
 *
 * @example
 * // Add to test harness
 * const physicsAccess = createPhysicsAccess();
 * harness.physics = physicsAccess;
 */
export function createPhysicsAccess(): PhysicsAccess {
  return {
    pause(): void {
      PhysicsWorldManager.getInstance().pause();
    },

    resume(): void {
      PhysicsWorldManager.getInstance().resume();
    },

    step(deltaMs: number): void {
      PhysicsWorldManager.getInstance().stepExact(deltaMs);
    },

    getBodyPosition(bodyId: number): { x: number; y: number } | null {
      return PhysicsWorldManager.getInstance().getBodyPosition(bodyId);
    },

    isBodySleeping(bodyId: number): boolean {
      return PhysicsWorldManager.getInstance().isBodySleeping(bodyId);
    },

    reset(): void {
      PhysicsWorldManager.getInstance().reset();
    },
  };
}
