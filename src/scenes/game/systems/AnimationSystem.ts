import type { Entity, Entity2D, Time } from '@play-co/odie';
import type { Sprite } from 'pixi.js';
import gsap from 'gsap';
import { BaseSystem } from './BaseSystem';
import { ScrewComponent } from '../components';
import { getGameVisual, getTrayPlaceholders } from '../factories';
import {
  getTraySlotPosition,
  getTraySlotTargetPosition,
  gameEvents,
  getAnimationLayer,
  getColoredTrayLayer,
} from '../utils';
import type { ScrewRemovalEvent } from './ScrewInteractionSystem';
import type {
  TrayHideEvent,
  TrayShiftEvent,
  TrayRevealEvent,
} from './TrayManagementSystem';
import type { ScrewComponentAccess } from '../types';
import {
  type AnimatorContext,
  type ScrewTransferEvent,
  ScrewRemovalAnimator,
  ScrewTransferAnimator,
  TrayHideAnimator,
  TrayShiftAnimator,
  TrayRevealAnimator,
} from './animation';

// Re-export types for external use
export type {
  ScrewRemovalCompleteEvent,
  ScrewTransferCompleteEvent,
  ScrewTransferEvent,
} from './animation';

/**
 * System for coordinating all game animations.
 *
 * This system acts as a coordinator that delegates animation work to
 * specialized animator classes. It manages the shared resources (timeline
 * tracking, layer access) and event listener registration.
 *
 * Animation types:
 * - Screw removal: Unscrew and fly to target tray
 * - Screw transfer: Move from buffer to colored tray
 * - Tray hide: Scale down and disappear when full
 * - Tray shift: Slide left when another tray hides
 * - Tray reveal: Slide in from right to replace hidden tray
 *
 * Listens for:
 * - `screw:startRemoval` - Begin removal animation
 * - `screw:startTransfer` - Begin transfer animation
 * - `tray:startHide` - Begin tray hide animation
 * - `tray:startShift` - Begin tray shift animation
 * - `tray:startReveal` - Begin tray reveal animation
 *
 * Emits (via animators):
 * - `screw:removalComplete`
 * - `screw:transferComplete`
 * - `tray:hideComplete`
 * - `tray:shiftComplete`
 * - `tray:revealComplete`
 */
export class AnimationSystem extends BaseSystem {
  static readonly NAME = 'animation';
  static Queries = {
    screws: { components: [ScrewComponent] },
  };

  /** Active GSAP timelines for cleanup */
  private activeTimelines = new Set<gsap.core.Timeline>();

  /** Screw removal animator */
  private screwRemoval!: ScrewRemovalAnimator;

  /** Screw transfer animator */
  private screwTransfer!: ScrewTransferAnimator;

  /** Tray hide animator */
  private trayHide!: TrayHideAnimator;

  /** Tray shift animator */
  private trayShift!: TrayShiftAnimator;

  /** Tray reveal animator */
  private trayReveal!: TrayRevealAnimator;

  // Bound event handlers
  private handleRemovalEvent = (event: ScrewRemovalEvent): void => {
    void this.screwRemoval.handle(event);
  };

  private handleTransferEvent = (event: ScrewTransferEvent): void => {
    void this.screwTransfer.handle(event);
  };

  private handleTrayHideEvent = (event: TrayHideEvent): void => {
    void this.trayHide.handle(event);
  };

  private handleTrayShiftEvent = (event: TrayShiftEvent): void => {
    void this.trayShift.handle(event);
  };

  private handleTrayRevealEvent = (event: TrayRevealEvent): void => {
    void this.trayReveal.handle(event);
  };

  /**
   * Initialize animators and event listeners.
   * @example
   * system.init(); // Called automatically by ECS
   */
  init(): void {
    // Create animator context with shared resources
    const ctx = this.createAnimatorContext();

    // Initialize all animators
    this.screwRemoval = new ScrewRemovalAnimator(ctx);
    this.screwTransfer = new ScrewTransferAnimator(ctx);
    this.trayHide = new TrayHideAnimator(ctx);
    this.trayShift = new TrayShiftAnimator(ctx);
    this.trayReveal = new TrayRevealAnimator(ctx);

    // Register event listeners
    gameEvents.on<ScrewRemovalEvent>(
      'screw:startRemoval',
      this.handleRemovalEvent
    );
    gameEvents.on<ScrewTransferEvent>(
      'screw:startTransfer',
      this.handleTransferEvent
    );
    gameEvents.on<TrayHideEvent>('tray:startHide', this.handleTrayHideEvent);
    gameEvents.on<TrayShiftEvent>('tray:startShift', this.handleTrayShiftEvent);
    gameEvents.on<TrayRevealEvent>(
      'tray:startReveal',
      this.handleTrayRevealEvent
    );
  }

  /**
   * Create the animator context with shared resources.
   * @returns Context object for animators
   * @example
   */
  private createAnimatorContext(): AnimatorContext {
    return {
      activeTimelines: this.activeTimelines,
      getScrewsInTray: (trayUID) => this.getScrewsInTray(trayUID),
      getComponents: (entity) => this.getComponents(entity),
      getAnimationLayer: () => getAnimationLayer(),
      getColoredTrayLayer: () => getColoredTrayLayer(),
      getGameVisual: (entity) => getGameVisual(entity) as Sprite | null,
      getTrayPlaceholders: (entity) => getTrayPlaceholders(entity) ?? null,
      getTraySlotTargetPosition: (displayOrder, slotIndex, capacity) =>
        getTraySlotTargetPosition(displayOrder, slotIndex, capacity),
      getTraySlotPosition: (trayEntity, slotIndex, isBuffer, capacity) =>
        getTraySlotPosition(trayEntity, slotIndex, isBuffer, capacity),
    };
  }

  /**
   * Find all screw entities currently in a specific tray.
   * @param trayUID - The UID of the tray to search
   * @returns Array of screw entities in the tray
   * @example
   */
  private getScrewsInTray(trayUID: string): Entity[] {
    const screws: Entity[] = [];
    this.forEachEntity('screws', (entity) => {
      const screw = this.getComponents<ScrewComponentAccess>(entity).screw;
      if (screw.state === 'inTray' && screw.trayEntityId === trayUID) {
        screws.push(entity);
      }
    });
    return screws;
  }

  /**
   * Hide a placeholder sprite when a screw fills that slot.
   * @param trayEntity - The tray entity
   * @param slotIndex - The slot index that was filled
   * @example
   * animationSystem.hidePlaceholder(trayEntity, 0);
   */
  public hidePlaceholder(trayEntity: Entity2D, slotIndex: number): void {
    const placeholders = getTrayPlaceholders(trayEntity);
    const placeholder = placeholders?.[slotIndex];
    if (placeholder) {
      gsap.to(placeholder, { alpha: 0, duration: 0.15, ease: 'linear' });
    }
  }

  /**
   * Update is a no-op for this system.
   * @param _time - Frame time info (unused)
   * @example
   * // Called automatically by ECS each frame
   * system.update(time);
   */
  update(_time: Time): void {
    // No per-frame updates needed - animations run via GSAP
  }

  /**
   * Clean up event listeners and active timelines when system is destroyed.
   * @example
   * system.destroy(); // Called automatically by ECS
   */
  destroy(): void {
    // Unregister event listeners
    gameEvents.off('screw:startRemoval', this.handleRemovalEvent);
    gameEvents.off('screw:startTransfer', this.handleTransferEvent);
    gameEvents.off('tray:startHide', this.handleTrayHideEvent);
    gameEvents.off('tray:startShift', this.handleTrayShiftEvent);
    gameEvents.off('tray:startReveal', this.handleTrayRevealEvent);

    // Kill active timelines
    for (const timeline of this.activeTimelines) {
      timeline.kill();
    }
    this.activeTimelines.clear();
  }
}
