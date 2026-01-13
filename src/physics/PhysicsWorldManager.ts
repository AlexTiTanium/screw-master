/**
 * PhysicsWorldManager - Singleton manager for Planck.js physics world.
 *
 * Manages the physics simulation including:
 * - World creation with gravity
 * - Body lifecycle (create, convert, destroy)
 * - Fixed timestep simulation for determinism
 * - Position queries and sleep state
 * - Boundary walls for world edges
 */

import { World, Vec2, Box } from 'planck';

import type { Body } from 'planck';
import type { Entity2D } from '@play-co/odie';

import { lerp, lerpAngle } from '@shared/utils/math';

import { PHYSICS_CONFIG } from './PhysicsConfig';
import type { BodySnapshot, PixelPosition } from './types';

/** Category bit for boundary walls - collides with all layers. */
const BOUNDARY_CATEGORY = 0x8000;

/** Category bits for all part layers combined. */
const ALL_PARTS_MASK = 0x00ff;

/** Body position in meters. */
interface BodyPosition {
  x: number;
  y: number;
}

/** Body dimensions in meters. */
interface BodyDimensions extends BodyPosition {
  halfWidth: number;
  halfHeight: number;
}

/**
 * Get the collision category bit for a given layer.
 *
 * @param layer - The layer number (1-8)
 * @returns The category bit for that layer
 * @example
 * const category = getLayerCategory(1); // returns 0x0001
 */
function getLayerCategory(layer: number): number {
  return 1 << (layer - 1);
}

/**
 * Singleton manager for Planck.js physics world.
 *
 * Manages physics simulation including body creation, stepping,
 * and position synchronization with game entities.
 *
 * @example
 * const physics = PhysicsWorldManager.getInstance();
 * const bodyId = physics.createBodyForPart(entity, 100, 50, true, 1);
 */
export class PhysicsWorldManager {
  private static instance: PhysicsWorldManager | null = null;

  // Planck.js World type is marked deprecated but is the correct API
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  private world: World;
  private bodies = new Map<number, Body>();
  /** Previous physics state (before most recent step) for interpolation. */
  private prevSnapshots = new Map<number, BodySnapshot>();
  private nextBodyId = 0;
  private accumulator = 0;
  private paused = false;
  private stepCount = 0;
  /** Last alpha value captured during render (for debug display). */
  private lastCapturedAlpha = 0;

  private constructor() {
    // Create world with gravity (negative Y because Planck uses standard coordinates)
    const gravityMeters = PHYSICS_CONFIG.gravity / PHYSICS_CONFIG.scale;
    this.world = new World({ gravity: new Vec2(0, gravityMeters) });

    this.createBoundaryWalls();
  }

  /**
   * Get singleton instance.
   *
   * @returns The PhysicsWorldManager singleton
   * @example
   * const physics = PhysicsWorldManager.getInstance();
   */
  static getInstance(): PhysicsWorldManager {
    PhysicsWorldManager.instance ??= new PhysicsWorldManager();
    return PhysicsWorldManager.instance;
  }

  /**
   * Destroy singleton instance (for testing).
   *
   * @example
   * PhysicsWorldManager.destroy();
   */
  static destroy(): void {
    if (PhysicsWorldManager.instance) {
      PhysicsWorldManager.instance.bodies.clear();
      PhysicsWorldManager.instance = null;
    }
  }

  /**
   * Create a physics body for a part entity.
   *
   * @param entity - The entity to create a body for
   * @param width - Width in pixels
   * @param height - Height in pixels
   * @param isStatic - Whether the body should be static
   * @param layer - The visual layer (1-8) for collision filtering
   * @returns Body ID for future reference
   * @example
   * const bodyId = physics.createBodyForPart(entity, 100, 50, true, 1);
   */
  createBodyForPart(
    entity: Entity2D,
    width: number,
    height: number,
    isStatic: boolean,
    layer = 1
  ): number {
    const dims = this.calculateBodyDimensions(entity, width, height);
    const body = this.createPartBody(dims, isStatic);
    this.attachPartFixture(body, dims, layer);
    return this.registerBody(body, entity.UID);
  }

  /**
   * Calculate body dimensions in meters.
   *
   * @param entity - The entity to calculate for
   * @param width - Width in pixels
   * @param height - Height in pixels
   * @returns Dimensions object
   * @example
   * const dims = this.calculateBodyDimensions(entity, 100, 50);
   */
  private calculateBodyDimensions(
    entity: Entity2D,
    width: number,
    height: number
  ): BodyDimensions {
    const scale = PHYSICS_CONFIG.scale;
    return {
      x: entity.position.x / scale,
      y: entity.position.y / scale,
      halfWidth: width / 2 / scale,
      halfHeight: height / 2 / scale,
    };
  }

  /**
   * Create a body for a part.
   *
   * @param dims - Body position in meters
   * @param isStatic - Whether body is static
   * @returns The created body
   * @example
   * const body = this.createPartBody(dims, true);
   */
  private createPartBody(dims: BodyPosition, isStatic: boolean): Body {
    return this.world.createBody({
      type: isStatic ? 'static' : 'dynamic',
      position: new Vec2(dims.x, dims.y),
      linearDamping: PHYSICS_CONFIG.linearDamping,
      angularDamping: PHYSICS_CONFIG.angularDamping,
    });
  }

  /**
   * Attach fixture with collision filtering.
   *
   * @param body - The body to attach fixture to
   * @param dims - Body dimensions in meters
   * @param layer - Collision layer
   * @example
   * this.attachPartFixture(body, dims, 1);
   */
  private attachPartFixture(
    body: Body,
    dims: BodyDimensions,
    layer: number
  ): void {
    const layerCategory = getLayerCategory(layer);
    body.createFixture({
      shape: new Box(dims.halfWidth, dims.halfHeight),
      density: PHYSICS_CONFIG.partDensity,
      friction: PHYSICS_CONFIG.friction,
      restitution: PHYSICS_CONFIG.restitution,
      filterCategoryBits: layerCategory,
      filterMaskBits: layerCategory | BOUNDARY_CATEGORY,
    });
  }

  /**
   * Register body and return ID.
   *
   * @param body - The body to register
   * @param entityUid - Entity UID for reverse lookup
   * @returns Body ID
   * @example
   * const bodyId = this.registerBody(body, entity.UID);
   */
  private registerBody(body: Body, entityUid: number): number {
    const bodyId = this.nextBodyId++;
    this.bodies.set(bodyId, body);
    body.setUserData({ entityUid, bodyId });
    return bodyId;
  }

  /**
   * Convert a static body to dynamic (for when part becomes free).
   *
   * @param bodyId - The body ID to convert
   * @example
   * physics.setBodyDynamic(bodyId);
   */
  setBodyDynamic(bodyId: number): void {
    const body = this.bodies.get(bodyId);
    if (!body) return;

    body.setType('dynamic');
    body.setAwake(true);
  }

  /**
   * Step the physics simulation with fixed timestep accumulator.
   *
   * Uses standard fixed timestep pattern: accumulate frame time, step physics
   * when enough time has accumulated, subtract fixedTimestep per step.
   *
   * For 60Hz physics on a 120Hz display:
   * - Each frame adds ~8.33ms to accumulator
   * - After 2 frames (~16.67ms), accumulator >= fixedTimestep, physics steps
   * - Alpha oscillates between 0.0 and ~0.5 (sawtooth pattern)
   *
   * @param deltaMs - Time elapsed in milliseconds
   * @example
   * physics.step(16.67); // ~60fps
   */
  step(deltaMs: number): void {
    if (this.paused) return;

    // Cap deltaMs to prevent spiral of death on large frame deltas (e.g., page load, tab switch)
    const cappedDelta = Math.min(deltaMs, PHYSICS_CONFIG.fixedTimestep * 4);
    this.accumulator += cappedDelta;

    // Standard fixed timestep loop - step when we have enough accumulated time
    while (this.accumulator >= PHYSICS_CONFIG.fixedTimestep) {
      // Capture state BEFORE stepping (this becomes the interpolation start point)
      this.capturePrevSnapshots();

      this.world.step(
        PHYSICS_CONFIG.fixedTimestep / 1000,
        PHYSICS_CONFIG.velocityIterations,
        PHYSICS_CONFIG.positionIterations
      );

      this.stepCount++;
      this.accumulator -= PHYSICS_CONFIG.fixedTimestep;
    }
  }

  /**
   * Capture current body transforms as previous state for interpolation.
   * Called before each physics step to save the pre-step positions.
   *
   * @example
   * // Called internally before physics step
   * this.capturePrevSnapshots();
   */
  private capturePrevSnapshots(): void {
    for (const [bodyId, body] of this.bodies) {
      const pos = body.getPosition();
      this.prevSnapshots.set(bodyId, {
        x: pos.x,
        y: pos.y,
        rotation: body.getAngle(),
      });
    }
  }

  /**
   * Step physics by exact delta (bypasses accumulator for deterministic testing).
   *
   * @param deltaMs - Exact time to step in milliseconds
   * @example
   * physics.stepExact(16.67);
   */
  stepExact(deltaMs: number): void {
    this.world.step(
      deltaMs / 1000,
      PHYSICS_CONFIG.velocityIterations,
      PHYSICS_CONFIG.positionIterations
    );
  }

  /**
   * Get body position in pixel coordinates.
   *
   * @param bodyId - The body ID to query
   * @returns Position in pixels or null if body not found
   * @example
   * const pos = physics.getBodyPosition(bodyId);
   */
  getBodyPosition(bodyId: number): PixelPosition | null {
    const body = this.bodies.get(bodyId);
    if (!body) return null;

    const pos = body.getPosition();
    return {
      x: pos.x * PHYSICS_CONFIG.scale,
      y: pos.y * PHYSICS_CONFIG.scale,
    };
  }

  /**
   * Get body rotation in radians.
   *
   * @param bodyId - The body ID to query
   * @returns Rotation in radians or 0 if body not found
   * @example
   * const angle = physics.getBodyRotation(bodyId);
   */
  getBodyRotation(bodyId: number): number {
    const body = this.bodies.get(bodyId);
    if (!body) return 0;

    return body.getAngle();
  }

  /**
   * Get interpolation alpha for smooth rendering.
   *
   * Alpha ranges from 0.0 (previous physics state) to ~1.0 (current state).
   * Calculated from accumulator: how far between physics steps we are.
   * Clamped to [0, 1] to handle edge cases like large frame deltas on load.
   *
   * @returns Alpha value in [0, 1]
   * @example
   * const alpha = physics.getInterpolationAlpha(); // 0.5 means halfway between steps
   */
  getInterpolationAlpha(): number {
    const alpha = this.accumulator / PHYSICS_CONFIG.fixedTimestep;
    return Math.max(0, Math.min(1, alpha));
  }

  /**
   * Get total physics step count since start (for monitoring).
   *
   * @returns Total number of physics steps executed
   * @example
   * const steps = physics.getStepCount();
   */
  getStepCount(): number {
    return this.stepCount;
  }

  /**
   * Capture current alpha value for debug display.
   * Should be called once per frame from the game's render loop,
   * ensuring the debug console shows the correct synchronized value.
   *
   * @returns The captured alpha value
   * @example
   * // In PhysicsSystem.update()
   * const alpha = physics.captureAlphaForDebug();
   */
  captureAlphaForDebug(): number {
    this.lastCapturedAlpha = this.getInterpolationAlpha();
    return this.lastCapturedAlpha;
  }

  /**
   * Get the last captured alpha value (for debug console).
   * This returns the alpha from when the game last rendered,
   * not the current accumulator state.
   *
   * @returns Last captured alpha value in [0, 1]
   * @example
   * const alpha = physics.getCapturedAlpha();
   */
  getCapturedAlpha(): number {
    return this.lastCapturedAlpha;
  }

  /**
   * Get interpolated body position in pixel coordinates.
   * Blends between previous and current physics state.
   *
   * @param bodyId - The body ID to query
   * @param alpha - Interpolation factor [0, 1]
   * @returns Interpolated position in pixels or null if body not found
   * @example
   * const alpha = physics.getInterpolationAlpha();
   * const pos = physics.getBodyPositionInterpolated(bodyId, alpha);
   */
  getBodyPositionInterpolated(
    bodyId: number,
    alpha: number
  ): PixelPosition | null {
    const body = this.bodies.get(bodyId);
    if (!body) return null;

    const prev = this.prevSnapshots.get(bodyId);
    const current = body.getPosition();

    // If no snapshot yet (before first physics step), use live body state
    if (!prev) {
      return {
        x: current.x * PHYSICS_CONFIG.scale,
        y: current.y * PHYSICS_CONFIG.scale,
      };
    }

    // Interpolate between previous snapshot and current live body state
    const x = lerp(prev.x, current.x, alpha) * PHYSICS_CONFIG.scale;
    const y = lerp(prev.y, current.y, alpha) * PHYSICS_CONFIG.scale;

    return { x, y };
  }

  /**
   * Get interpolated body rotation in radians.
   * Blends between previous and current physics state.
   * Uses angular interpolation to handle the -π/π boundary correctly.
   *
   * @param bodyId - The body ID to query
   * @param alpha - Interpolation factor [0, 1]
   * @returns Interpolated rotation in radians
   * @example
   * const alpha = physics.getInterpolationAlpha();
   * const rotation = physics.getBodyRotationInterpolated(bodyId, alpha);
   */
  getBodyRotationInterpolated(bodyId: number, alpha: number): number {
    const body = this.bodies.get(bodyId);
    if (!body) return 0;

    const prev = this.prevSnapshots.get(bodyId);
    const current = body.getAngle();

    // If no snapshot yet (before first physics step), use live body state
    if (!prev) {
      return current;
    }

    // Interpolate rotation using angular interpolation (handles -π/π boundary)
    return lerpAngle(prev.rotation, current, alpha);
  }

  /**
   * Check if a body is sleeping (at rest).
   *
   * @param bodyId - The body ID to check
   * @returns True if sleeping or body not found
   * @example
   * if (physics.isBodySleeping(bodyId)) { ... }
   */
  isBodySleeping(bodyId: number): boolean {
    const body = this.bodies.get(bodyId);
    if (!body) return true;

    return !body.isAwake();
  }

  /**
   * Remove a body from the simulation.
   *
   * @param bodyId - The body ID to remove
   * @example
   * physics.removeBody(bodyId);
   */
  removeBody(bodyId: number): void {
    const body = this.bodies.get(bodyId);
    if (!body) return;

    this.world.destroyBody(body);
    this.bodies.delete(bodyId);
    this.prevSnapshots.delete(bodyId);
  }

  /**
   * Pause physics simulation.
   *
   * @example
   * physics.pause();
   */
  pause(): void {
    this.paused = true;
  }

  /**
   * Resume physics simulation.
   *
   * @example
   * physics.resume();
   */
  resume(): void {
    this.paused = false;
  }

  /**
   * Check if simulation is paused.
   *
   * @returns True if paused
   * @example
   * if (physics.isPaused()) { ... }
   */
  isPaused(): boolean {
    return this.paused;
  }

  /**
   * Reset physics world (clear all dynamic bodies, keep boundaries).
   * Used for level restart.
   *
   * @example
   * physics.reset();
   */
  reset(): void {
    // Remove all user-created bodies
    for (const [, body] of this.bodies) {
      this.world.destroyBody(body);
    }
    this.bodies.clear();
    this.prevSnapshots.clear();
    this.nextBodyId = 0;
    this.accumulator = 0;
    this.stepCount = 0;
    this.paused = false;
  }

  /**
   * Get all body IDs (for debugging).
   *
   * @returns Array of body IDs
   * @example
   * const ids = physics.getAllBodyIds();
   */
  getAllBodyIds(): number[] {
    return Array.from(this.bodies.keys());
  }

  /**
   * Create boundary walls around the play area.
   * Note: No bottom wall - parts fall through and get cleaned up.
   *
   * @example
   * // Called automatically in constructor
   */
  private createBoundaryWalls(): void {
    const dims = this.calculateBoundaryDimensions();
    // Left wall
    this.createWall(
      dims.minX - dims.thickness / 2,
      dims.centerY,
      dims.thickness / 2,
      dims.height + dims.thickness
    );
    // Right wall
    this.createWall(
      dims.maxX + dims.thickness / 2,
      dims.centerY,
      dims.thickness / 2,
      dims.height + dims.thickness
    );
  }

  /**
   * Calculate boundary dimensions in meters.
   *
   * @returns Boundary dimensions object
   * @example
   * const dims = this.calculateBoundaryDimensions();
   */
  private calculateBoundaryDimensions(): {
    thickness: number;
    minX: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
    centerX: number;
    centerY: number;
  } {
    const { playArea, boundaryThickness, scale } = PHYSICS_CONFIG;
    const thickness = boundaryThickness / scale;
    const minX = playArea.minX / scale;
    const maxX = playArea.maxX / scale;
    const minY = playArea.minY / scale;
    const maxY = playArea.maxY / scale;
    return {
      thickness,
      minX,
      maxX,
      maxY,
      width: (maxX - minX) / 2,
      height: (maxY - minY) / 2,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2,
    };
  }

  /**
   * Create a single wall body.
   *
   * @param x - X position in meters
   * @param y - Y position in meters
   * @param halfWidth - Half-width of the wall
   * @param halfHeight - Half-height of the wall
   * @example
   * this.createWall(5, 10, 1, 0.5);
   */
  private createWall(
    x: number,
    y: number,
    halfWidth: number,
    halfHeight: number
  ): void {
    const wall = this.world.createBody({
      type: 'static',
      position: new Vec2(x, y),
    });
    // Boundary walls collide with all layers
    wall.createFixture({
      shape: new Box(halfWidth, halfHeight),
      friction: PHYSICS_CONFIG.friction,
      filterCategoryBits: BOUNDARY_CATEGORY,
      filterMaskBits: ALL_PARTS_MASK,
    });
  }
}
