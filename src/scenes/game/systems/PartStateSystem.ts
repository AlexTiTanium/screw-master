/**
 * PartStateSystem - Monitors screw removal and updates part state.
 *
 * This system:
 * - Listens for screw:startRemoval events
 * - Decrements the parent part's screwCount with a delay
 * - When screwCount reaches 0, transitions part to 'free' state
 * - Emits part:freed event for physics system to handle
 *
 * @example
 * // System registration
 * scene.addSystem(PartStateSystem);
 *
 * // Listen for freed parts
 * gameEvents.on('part:freed', ({ partEntity, partId }) => {
 *   console.log(`Part ${partId} is now free!`);
 * });
 */

import type { Time, Entity } from '@play-co/odie';

import { PartComponent } from '../components';
import { gameEvents } from '../utils';

import { BaseSystem } from './BaseSystem';

import type { ScrewRemovalEvent } from './ScrewInteractionSystem';

/** Delay in milliseconds before part starts falling after screw tap. */
const FALL_DELAY_MS = 100;

/** Event data for part:freed */
export interface PartFreedEvent {
  partEntity: Entity;
  partId: string;
}

/** Part component data for internal use */
interface PartComponentData {
  screwCount: number;
  state: string;
  partDefinitionId: string;
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
    parts: { components: [PartComponent] },
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
   * @param data - The screw removal event data
   * @example
   * // Called internally via event subscription
   */
  private handleScrewRemoval(data: ScrewRemovalEvent): void {
    const partEntity = this.findPartEntityForScrew(data.screwEntity);
    if (!partEntity) return;

    const part = this.getPartComponent(partEntity);
    if (part.state === 'free') return;

    part.screwCount = Math.max(0, part.screwCount - 1);

    if (part.screwCount === 0) {
      // Delay part freeing so fall starts shortly after tap
      const timeout = setTimeout(() => {
        this.pendingTimeouts.delete(timeout);
        // Re-check state in case something changed
        if (part.state !== 'free') {
          this.freePart(partEntity, part);
        }
      }, FALL_DELAY_MS);
      this.pendingTimeouts.add(timeout);
    }
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
   * Transition part to free state and emit event.
   *
   * @param partEntity - The part entity to free
   * @param part - The part component data to update
   * @example
   * this.freePart(partEntity, part);
   */
  private freePart(partEntity: Entity, part: PartComponentData): void {
    part.state = 'free';
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
