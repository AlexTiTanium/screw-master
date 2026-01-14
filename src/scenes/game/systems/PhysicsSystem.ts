/**
 * PhysicsSystem - Manages physics simulation for game entities.
 *
 * This system:
 * - Steps the Planck.js physics world each frame
 * - Listens for part:freed events and converts bodies to dynamic
 * - Syncs physics body positions back to entity positions
 * - Fades out falling parts and destroys them when off-screen
 *
 * @example
 * // System registration (after PartStateSystem)
 * scene.addSystem(PhysicsSystem);
 */

import type { Time, Entity, Entity2D } from '@play-co/odie';

import { PhysicsWorldManager, PHYSICS_CONFIG } from '@physics';
import { isTestMode } from '@shared/debug';

import { PhysicsBodyComponent } from '../components';
import { gameEvents } from '../utils';

import { BaseSystem } from './BaseSystem';

import type { PartFreedEvent } from './PartStateSystem';
import type {
  PhysicsBodyComponentAccess,
  PartComponentAccess,
} from '../types/component-access';

/** Distance in pixels for fade-out effect. */
const FADE_DISTANCE = 400;

/** Y position threshold for destroying off-screen parts. */
const DESTROY_Y_THRESHOLD = PHYSICS_CONFIG.playArea.maxY + 200;

/** Event data for part:settled */
export interface PartSettledEvent {
  partEntity: Entity;
}

/**
 * Type assertion helper for Entity2D.
 *
 * @param entity - Base entity to cast
 * @returns The entity cast as Entity2D
 * @example
 * const entity2d = asEntity2D(baseEntity);
 */
function asEntity2D(entity: Entity): Entity2D {
  return entity as unknown as Entity2D;
}

/**
 * System that manages physics simulation for game entities.
 *
 * @example
 * scene.addSystem(PhysicsSystem);
 */
export class PhysicsSystem extends BaseSystem {
  static readonly NAME = 'physics';

  static Queries = {
    physicsBodies: { components: [PhysicsBodyComponent] },
  };

  private physicsManager: PhysicsWorldManager;
  private boundHandlePartFreed: (data: PartFreedEvent) => void;

  /** Tracks falling parts with their starting Y position for fade calculation. */
  private fallingParts = new Map<number, number>();

  /** Entities queued for destruction after update loop. */
  private entitiesToDestroy: Entity2D[] = [];

  constructor() {
    super();
    this.physicsManager = PhysicsWorldManager.getInstance();
    this.boundHandlePartFreed = this.handlePartFreed.bind(this);
  }

  /**
   * Initialize the system and subscribe to events.
   *
   * @example
   * system.init();
   */
  init(): void {
    gameEvents.on<PartFreedEvent>('part:freed', this.boundHandlePartFreed);
  }

  /**
   * Cleanup event subscriptions.
   *
   * @example
   * system.destroy();
   */
  destroy(): void {
    gameEvents.off('part:freed', this.boundHandlePartFreed);
  }

  /**
   * Handle part:freed event by converting physics body to dynamic.
   *
   * @param data - The part freed event data
   * @example
   * // Called internally via event subscription
   */
  private handlePartFreed(data: PartFreedEvent): void {
    const { partEntity } = data;
    const entity2d = asEntity2D(partEntity);
    const physicsBody =
      this.getComponents<PhysicsBodyComponentAccess>(partEntity).physicsBody;

    if (physicsBody.bodyId < 0) return;

    this.physicsManager.setBodyDynamic(physicsBody.bodyId);
    physicsBody.bodyType = 'dynamic';
    physicsBody.isSleeping = false;

    // Track starting position for fade calculation
    this.fallingParts.set(partEntity.UID, entity2d.position.y);
  }

  /**
   * Step physics and sync positions each frame.
   *
   * @param time - Frame time info
   * @example
   * // Called automatically by ODIE each frame
   */
  update(time: Time): void {
    // ODIE's time.deltaTime is in milliseconds
    this.physicsManager.step(time.deltaTime);

    // Disable interpolation in test mode for determinism
    // Use captureAlphaForDebug() to sync debug console display with actual render
    const alpha = isTestMode()
      ? 1.0
      : this.physicsManager.captureAlphaForDebug();

    this.forEachEntity('physicsBodies', (baseEntity) => {
      this.syncEntityPhysics(asEntity2D(baseEntity), alpha);
    });

    // Destroy queued entities after iteration
    this.processEntityDestruction();
  }

  /**
   * Process queued entity destruction.
   *
   * @example
   * this.processEntityDestruction();
   */
  private processEntityDestruction(): void {
    for (const entity of this.entitiesToDestroy) {
      this.destroyFallingPart(entity);
    }
    this.entitiesToDestroy = [];
  }

  /**
   * Destroy a falling part entity and clean up physics.
   *
   * @param entity - The entity to destroy
   * @example
   * this.destroyFallingPart(entity);
   */
  private destroyFallingPart(entity: Entity2D): void {
    const physicsBody =
      this.getComponents<PhysicsBodyComponentAccess>(entity).physicsBody;

    if (physicsBody.bodyId >= 0) {
      this.physicsManager.removeBody(physicsBody.bodyId);
    }

    this.fallingParts.delete(entity.UID);
    this.scene.removeChild(entity);
  }

  /**
   * @param entity - The entity to check
   * @returns True if the entity is in pivoting or loosened state
   * @example this.isPivotingOrLoosened(entity);
   */
  private isPivotingOrLoosened(entity: Entity2D): boolean {
    // Check if entity has PartComponent
    const components = entity.c as unknown as Partial<PartComponentAccess>;
    if (!components.part) return false;

    const state = components.part.state;
    return state === 'pivoting' || state === 'loosened';
  }

  /**
   * Sync physics state to entity position.
   *
   * @param entity - The entity to sync
   * @param alpha - Interpolation factor [0, 1]
   * @example
   * this.syncEntityPhysics(entity, 0.5);
   */
  private syncEntityPhysics(entity: Entity2D, alpha: number): void {
    const physicsBody =
      this.getComponents<PhysicsBodyComponentAccess>(entity).physicsBody;
    if (
      !physicsBody.enabled ||
      physicsBody.bodyId < 0 ||
      physicsBody.bodyType === 'static'
    )
      return;

    // Skip pivoting/loosened parts - they're synced by PivotPhysicsSystem
    if (this.isPivotingOrLoosened(entity)) return;

    this.updateEntityPosition(entity, physicsBody.bodyId, alpha);
    this.updateEntityRotation(entity, physicsBody.bodyId, alpha);

    // Handle falling parts: fade and destruction
    if (this.fallingParts.has(entity.UID)) {
      this.updateFallingPart(entity);
    } else {
      this.checkSettled(entity, physicsBody);
    }
  }

  /**
   * Update a falling part's opacity and check for destruction.
   *
   * @param entity - The falling entity
   * @example
   * this.updateFallingPart(entity);
   */
  private updateFallingPart(entity: Entity2D): void {
    const currentY = entity.position.y;
    const fadeStartY = PHYSICS_CONFIG.playArea.maxY;

    // Check if entity should be destroyed
    if (currentY > DESTROY_Y_THRESHOLD) {
      this.entitiesToDestroy.push(entity);
      return;
    }

    // Apply fade when below play area
    if (currentY > fadeStartY) {
      const fadeProgress = Math.min((currentY - fadeStartY) / FADE_DISTANCE, 1);
      entity.view.alpha = 1 - fadeProgress;
    }
  }

  /**
   * Update entity position from physics (with interpolation).
   *
   * @param entity - The entity to update
   * @param bodyId - The physics body ID
   * @param alpha - Interpolation factor [0, 1]
   * @example
   * this.updateEntityPosition(entity, bodyId, 0.5);
   */
  private updateEntityPosition(
    entity: Entity2D,
    bodyId: number,
    alpha: number
  ): void {
    const position = this.physicsManager.getBodyPositionInterpolated(
      bodyId,
      alpha
    );
    if (position) {
      entity.position.x = position.x;
      entity.position.y = position.y;
    }
  }

  /**
   * Update entity rotation from physics (with interpolation).
   *
   * @param entity - The entity to update
   * @param bodyId - The physics body ID
   * @param alpha - Interpolation factor [0, 1]
   * @example
   * this.updateEntityRotation(entity, bodyId, 0.5);
   */
  private updateEntityRotation(
    entity: Entity2D,
    bodyId: number,
    alpha: number
  ): void {
    entity.view.rotation = this.physicsManager.getBodyRotationInterpolated(
      bodyId,
      alpha
    );
  }

  /**
   * Check if body has settled and emit event.
   *
   * @param entity - The entity to check
   * @param physicsBody - The physics body component
   * @example
   * this.checkSettled(entity, physicsBody);
   */
  private checkSettled(
    entity: Entity2D,
    physicsBody: PhysicsBodyComponentAccess['physicsBody']
  ): void {
    const wasSleeping = physicsBody.isSleeping;
    const isSleeping = this.physicsManager.isBodySleeping(physicsBody.bodyId);
    physicsBody.isSleeping = isSleeping;

    if (!wasSleeping && isSleeping) {
      gameEvents.emit('part:settled', {
        partEntity: entity,
      } satisfies PartSettledEvent);
    }
  }
}
