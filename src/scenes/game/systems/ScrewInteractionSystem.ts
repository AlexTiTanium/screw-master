import type { Entity, Entity2D, Time } from '@play-co/odie';
import { TouchInput } from '@play-co/astro';
import { BaseSystem } from './BaseSystem';
import { ScrewComponent, GameStateComponent } from '../components';
import { ScrewPlacementSystem } from './ScrewPlacementSystem';
import { gameEvents } from '../utils';
import type { ScrewComponentAccess, GameStateComponentAccess } from '../types';

// Re-export component access types for use in other systems
export type { ScrewComponentAccess, GameStateComponentAccess };

/**
 * Event data emitted when a screw removal starts.
 */
export interface ScrewRemovalEvent {
  /** The screw entity being removed */
  screwEntity: Entity;
  /** The target tray entity */
  targetTray: Entity;
  /** Slot index in the target tray */
  slotIndex: number;
  /** Whether the target is a buffer tray */
  isBuffer: boolean;
}

/**
 * System for handling screw tap interactions.
 *
 * This system attaches TouchInput handlers to screw entities and
 * initiates the removal sequence when a screw is tapped.
 *
 * Emits:
 * - `screw:startRemoval` - When a valid screw tap initiates removal
 *
 * @example
 * scene.addSystem(ScrewInteractionSystem);
 *
 * // Listen for removal events
 * scene.on('screw:startRemoval', (event: ScrewRemovalEvent) => {
 *   console.log('Removing screw to slot', event.slotIndex);
 * });
 */
export class ScrewInteractionSystem extends BaseSystem {
  static readonly NAME = 'screwInteraction';
  static Queries = {
    screws: { components: [ScrewComponent] },
    gameState: { components: [GameStateComponent] },
  };

  /** TouchInput instances for each screw entity */
  private touchInputs = new Map<number, TouchInput>();

  /** Flag to track if system has been initialized */
  private initialized = false;

  /**
   * Initialize touch inputs for all existing screw entities.
   * Called on first update to ensure entities are ready.
   * @example
   */
  private initTouchInputs(): void {
    if (this.initialized) return;
    this.initialized = true;

    this.forEachEntity('screws', (entity) => {
      this.setupTouchInput(entity);
    });
  }

  /**
   * Set up touch input for a single screw entity.
   * @param entity - The screw entity
   * @example
   */
  private setupTouchInput(entity: Entity): void {
    // Skip if already set up
    if (this.touchInputs.has(entity.UID)) return;

    const entity2d = entity as Entity2D;
    const view = entity2d.view;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- view may be null during entity creation
    if (!view) return;

    // Make interactive
    view.eventMode = 'static';
    view.cursor = 'pointer';

    const input = new TouchInput(view);
    input.onTap = (): Promise<void> => {
      this.handleScrewTap(entity);
      return Promise.resolve();
    };

    this.touchInputs.set(entity.UID, input);
  }

  /**
   * Handle a tap on a screw entity.
   * @param entity - The screw entity
   * @example
   */
  private handleScrewTap(entity: Entity): void {
    const screw = (entity.c as unknown as ScrewComponentAccess).screw;

    // Guard: Check game state
    const gameStateEntity = this.getFirstEntity('gameState');
    if (gameStateEntity) {
      const gameState = (gameStateEntity.c as unknown as GameStateComponentAccess).gameState;
      if (gameState.phase !== 'playing') {
        return; // Game is over
      }
    }

    // Guard: Only allow tapping screws that are in the board
    if (screw.state !== 'inBoard') {
      return;
    }

    // Guard: Don't allow interaction during animation
    if (screw.isAnimating) {
      return;
    }

    // Find a valid placement target
    const placementSystem = this.scene.getSystem(
      ScrewPlacementSystem
    );
    const target = placementSystem.findPlacementTarget(screw.color);

    if (!target) {
      // No valid placement - could show feedback here
      return;
    }

    // Reserve the slot immediately to prevent race conditions
    placementSystem.reserveSlot(target, entity);

    // Mark as animating and change state
    screw.isAnimating = true;
    screw.state = 'dragging'; // Intermediate state during animation

    // Emit event for AnimationSystem to handle
    const event: ScrewRemovalEvent = {
      screwEntity: entity,
      targetTray: target.tray,
      slotIndex: target.slotIndex,
      isBuffer: target.type === 'buffer',
    };

    gameEvents.emit('screw:startRemoval', event);
  }

  /**
   * Clean up touch input for a screw entity.
   * @param entity - The screw entity
   * @example
   */
  private cleanupTouchInput(entity: Entity): void {
    const input = this.touchInputs.get(entity.UID);
    if (input) {
      input.enabled = false;
      this.touchInputs.delete(entity.UID);
    }
  }

  /**
   * Update checks for new screws and initializes them.
   * @param _time - Frame time info (unused)
   * @example
   */
  update(_time: Time): void {
    // Initialize on first update
    if (!this.initialized) {
      this.initTouchInputs();
      return;
    }

    // Check for any new screws that need touch input setup
    this.forEachEntity('screws', (entity) => {
      if (!this.touchInputs.has(entity.UID)) {
        this.setupTouchInput(entity);
      }
    });
  }

  /**
   * Clean up all touch inputs when system is destroyed.
   * @example
   */
  destroy(): void {
    for (const [uid] of this.touchInputs) {
      const entity = this.getEntities('screws').find((e) => e.UID === uid);
      if (entity) {
        this.cleanupTouchInput(entity);
      }
    }
    this.touchInputs.clear();
    this.initialized = false;
  }
}
