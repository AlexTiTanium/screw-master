/**
 * Physics module public exports.
 *
 * This module provides Planck.js physics integration for the game.
 */

export { PhysicsWorldManager } from './PhysicsWorldManager';
export { PHYSICS_CONFIG } from './PhysicsConfig';
export type { PhysicsConfig } from './PhysicsConfig';
export type {
  BodyType,
  PixelPosition,
  CreateBodyOptions,
  PhysicsAccess,
  BodySnapshot,
} from './types';
