/**
 * Physics system type definitions.
 */

/** Body type determines how physics affects the body */
export type BodyType = 'static' | 'dynamic';

/** Position in pixel coordinates */
export interface PixelPosition {
  x: number;
  y: number;
}

/** Physics body creation options */
export interface CreateBodyOptions {
  /** X position in pixels */
  x: number;
  /** Y position in pixels */
  y: number;
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
  /** Whether body is static (true) or dynamic (false) */
  isStatic: boolean;
  /** Optional entity UID for reference */
  entityUid?: number;
}

/** Physics access interface for test harness */
export interface PhysicsAccess {
  /** Pause physics simulation */
  pause(): void;
  /** Resume physics simulation */
  resume(): void;
  /** Step physics by exact delta (for deterministic testing) */
  step(deltaMs: number): void;
  /** Get body position in pixels */
  getBodyPosition(bodyId: number): PixelPosition | null;
  /** Check if body is sleeping (at rest) */
  isBodySleeping(bodyId: number): boolean;
  /** Reset physics world (clear all bodies except boundaries) */
  reset(): void;
}
