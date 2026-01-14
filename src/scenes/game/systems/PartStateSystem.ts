/**
 * PartStateSystem - Monitors screw removal and updates part state.
 *
 * This system:
 * - Listens for screw:startRemoval events
 * - Decrements the parent part's screwCount immediately
 * - Transitions parts through states: static → loosened → pivoting → free
 * - Emits part:stateChanged immediately for physics joint creation
 * - Emits part:freed after delay for final fall animation
 *
 * State transitions:
 * - 3+ screws: static (fully fixed)
 * - 2 screws: loosened (slight wobble)
 * - 1 screw: pivoting (swings around remaining screw)
 * - 0 screws: free (falls with gravity)
 *
 * @example
 * // System registration
 * scene.addSystem(PartStateSystem);
 *
 * // Listen for state changes (for physics)
 * gameEvents.on('part:stateChanged', ({ partEntity, newState }) => {
 *   console.log(`Part state changed to ${newState}`);
 * });
 *
 * // Listen for freed parts (for fall animation)
 * gameEvents.on('part:freed', ({ partEntity, partId }) => {
 *   console.log(`Part ${partId} is now free!`);
 * });
 */

import type { Time, Entity, Entity2D } from '@play-co/odie';

import { PartComponent, ScrewComponent, PivotComponent } from '../components';
import type { PartState } from '../components';
import { gameEvents } from '../utils';

import { BaseSystem } from './BaseSystem';

import type { ScrewRemovalEvent } from './ScrewInteractionSystem';
import type { PivotComponentAccess, ScrewComponentAccess } from '../types';

/** Delay in milliseconds before part starts falling after screw tap. */
const FALL_DELAY_MS = 100;

/** Event data for part:freed */
export interface PartFreedEvent {
  partEntity: Entity;
  partId: string;
}

/** Event data for part:stateChanged */
export interface PartStateChangedEvent {
  partEntity: Entity;
  partId: string;
  previousState: PartState;
  newState: PartState;
  screwCount: number;
}

/** Part component data for internal use */
interface PartComponentData {
  screwCount: number;
  state: PartState;
  partDefinitionId: string;
}

/** Pivot component data for internal use */
interface PivotComponentData {
  isPivoting: boolean;
  pivotScrewEntityId: string;
  pivotPoint: { x: number; y: number };
  angleLimit: number;
  isDragging: boolean;
}

/**
 * System that monitors screw removal and updates part state.
 *
 * @example
 * scene.addSystem(PartStateSystem);
 */
export class PartStateSystem extends BaseSystem {
  static readonly NAME = 'partState';

  static Queries = {
    parts: { components: [PartComponent, PivotComponent] },
    screws: { components: [ScrewComponent] },
  };

  private boundHandleScrewRemoval: (data: ScrewRemovalEvent) => void;

  /** Pending timeouts for delayed part freeing. */
  private pendingTimeouts = new Set<ReturnType<typeof setTimeout>>();

  constructor() {
    super();
    this.boundHandleScrewRemoval = this.handleScrewRemoval.bind(this);
  }

  /**
   * Initialize the system and subscribe to events.
   *
   * @example
   * system.init();
   */
  init(): void {
    gameEvents.on<ScrewRemovalEvent>(
      'screw:startRemoval',
      this.boundHandleScrewRemoval
    );
  }

  /**
   * Cleanup event subscriptions.
   *
   * @example
   * system.destroy();
   */
  destroy(): void {
    gameEvents.off('screw:startRemoval', this.boundHandleScrewRemoval);
    // Clear any pending timeouts
    for (const timeout of this.pendingTimeouts) {
      clearTimeout(timeout);
    }
    this.pendingTimeouts.clear();
  }

  /**
   * Handle screw removal event.
   *
   * Immediately decrements screwCount and transitions part state.
   * State change events are emitted immediately for physics system.
   * The final 'free' state has a small delay for animation timing.
   *
   * @param data - The screw removal event data
   * @example
   * // Called internally via event subscription
   */
  private handleScrewRemoval(data: ScrewRemovalEvent): void {
    const partEntity = this.findPartEntityForScrew(data.screwEntity);
    if (!partEntity) return;

    const part = this.getPartComponent(partEntity);
    if (part.state === 'free') return;

    const previousState = part.state;
    part.screwCount = Math.max(0, part.screwCount - 1);

    // Calculate the new state based on screw count
    const newState = this.calculatePartState(part.screwCount);

    if (newState !== previousState) {
      // Handle pivot setup when transitioning to pivoting state
      if (newState === 'pivoting') {
        this.setupPivotState(partEntity, data.screwEntity);
      }

      // Clear pivot state when leaving pivoting
      if (previousState === 'pivoting' && newState !== 'pivoting') {
        this.clearPivotState(partEntity);
      }

      // Emit state change immediately (for physics joint creation)
      if (newState !== 'free') {
        part.state = newState;
        this.emitStateChanged(partEntity, part, previousState, newState);
      } else {
        // For 'free' state, delay the transition slightly for animation timing
        const timeout = setTimeout(() => {
          this.pendingTimeouts.delete(timeout);
          // Re-check state in case something changed
          if (part.state !== 'free') {
            this.clearPivotState(partEntity);
            this.freePart(partEntity, part, previousState);
          }
        }, FALL_DELAY_MS);
        this.pendingTimeouts.add(timeout);
      }
    }
  }

  /**
   * Calculate the appropriate part state based on screw count.
   *
   * @param screwCount - Number of screws remaining
   * @returns The appropriate part state
   * @example
   * const state = this.calculatePartState(2); // 'loosened'
   */
  private calculatePartState(screwCount: number): PartState {
    if (screwCount === 0) return 'free';
    if (screwCount === 1) return 'pivoting';
    if (screwCount === 2) return 'loosened';
    return 'static';
  }

  /**
   * Setup pivot component when part transitions to pivoting state.
   *
   * @param partEntity - The part entity
   * @param removedScrewEntity - The screw being removed (to find remaining screw)
   * @example
   * this.setupPivotState(partEntity, removedScrewEntity);
   */
  private setupPivotState(
    partEntity: Entity,
    removedScrewEntity: Entity
  ): void {
    const remainingScrew = this.findRemainingScrewForPart(
      partEntity,
      removedScrewEntity
    );
    if (!remainingScrew) return;

    const pivot = this.getPivotComponent(partEntity);
    const screwEntity2d = remainingScrew as Entity2D;

    pivot.isPivoting = true;
    pivot.pivotScrewEntityId = String(remainingScrew.UID);
    pivot.pivotPoint.x = screwEntity2d.position.x;
    pivot.pivotPoint.y = screwEntity2d.position.y;
  }

  /**
   * Clear pivot component state.
   *
   * @param partEntity - The part entity
   * @example
   * this.clearPivotState(partEntity);
   */
  private clearPivotState(partEntity: Entity): void {
    const pivot = this.getPivotComponent(partEntity);
    pivot.isPivoting = false;
    pivot.pivotScrewEntityId = '';
    pivot.isDragging = false;
  }

  /**
   * Find the remaining screw attached to a part (excluding the one being removed).
   *
   * @param partEntity - The part entity
   * @param excludeScrewEntity - The screw being removed (to exclude from search)
   * @returns The remaining screw entity or undefined
   * @example
   * const remaining = this.findRemainingScrewForPart(partEntity, removedScrew);
   */
  private findRemainingScrewForPart(
    partEntity: Entity,
    excludeScrewEntity: Entity
  ): Entity | undefined {
    const partId = String(partEntity.UID);
    let remainingScrew: Entity | undefined;

    this.forEachEntity('screws', (screwEntity) => {
      // Skip the screw being removed
      if (screwEntity.UID === excludeScrewEntity.UID) return;

      const screw = this.getComponents<ScrewComponentAccess>(screwEntity).screw;
      // Find screws still attached to this part (state should still be 'inBoard')
      if (screw.partEntityId === partId && screw.state === 'inBoard') {
        remainingScrew = screwEntity;
      }
    });

    return remainingScrew;
  }

  /**
   * Emit state changed event.
   *
   * @param partEntity - The part entity
   * @param part - The part component data
   * @param previousState - Previous state
   * @param newState - New state
   * @example
   * this.emitStateChanged(partEntity, part, 'static', 'loosened');
   */
  private emitStateChanged(
    partEntity: Entity,
    part: PartComponentData,
    previousState: PartState,
    newState: PartState
  ): void {
    gameEvents.emit('part:stateChanged', {
      partEntity,
      partId: part.partDefinitionId,
      previousState,
      newState,
      screwCount: part.screwCount,
    } satisfies PartStateChangedEvent);
  }

  /**
   * Get the pivot component from an entity.
   *
   * @param entity - The entity to get component from
   * @returns The pivot component data
   * @example
   * const pivot = this.getPivotComponent(entity);
   */
  private getPivotComponent(entity: Entity): PivotComponentData {
    return this.getComponents<PivotComponentAccess>(entity).pivot;
  }

  /**
   * Find the part entity that owns the given screw.
   *
   * @param screwEntity - The screw entity to find parent for
   * @returns The parent part entity or undefined
   * @example
   * const part = this.findPartEntityForScrew(screwEntity);
   */
  private findPartEntityForScrew(screwEntity: Entity): Entity | undefined {
    const screw = this.getComponents<{ screw: { partEntityId?: string } }>(
      screwEntity
    ).screw;
    if (!screw.partEntityId) return undefined;

    let partEntity: Entity | undefined;
    this.forEachEntity('parts', (entity) => {
      if (String(entity.UID) === screw.partEntityId) {
        partEntity = entity;
      }
    });
    return partEntity;
  }

  /**
   * Get the part component from an entity.
   *
   * @param entity - The entity to get component from
   * @returns The part component data
   * @example
   * const part = this.getPartComponent(entity);
   */
  private getPartComponent(entity: Entity): PartComponentData {
    return this.getComponents<{ part: PartComponentData }>(entity).part;
  }

  /**
   * Transition part to free state and emit events.
   *
   * @param partEntity - The part entity to free
   * @param part - The part component data to update
   * @param previousState - Previous state before freeing
   * @example
   * this.freePart(partEntity, part, 'pivoting');
   */
  private freePart(
    partEntity: Entity,
    part: PartComponentData,
    previousState: PartState
  ): void {
    part.state = 'free';

    // Emit state change event first
    this.emitStateChanged(partEntity, part, previousState, 'free');

    // Then emit freed event for physics system
    gameEvents.emit('part:freed', {
      partEntity,
      partId: part.partDefinitionId,
    } satisfies PartFreedEvent);
  }

  /**
   * Update is a no-op - this system is event-driven.
   *
   * @param _time - Frame time (unused)
   * @example
   * // Called automatically by ODIE each frame
   */
  update(_time: Time): void {
    // Event-driven system, no per-frame updates needed
  }
}
