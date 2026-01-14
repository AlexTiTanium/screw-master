import type { Entity, Entity2D, Time } from '@play-co/odie';
import { BaseSystem } from './BaseSystem';
import { TrayComponent, ScrewComponent } from '../components';
import { gameEvents, gameTick } from '../utils';
import type {
  ScrewRemovalCompleteEvent,
  ScrewTransferCompleteEvent,
} from './AnimationSystem';
import type { TrayComponentAccess } from '../types';

/**
 * Event data emitted when a tray should start hiding.
 */
export interface TrayHideEvent {
  /** The tray entity to hide */
  trayEntity: Entity;
}

/**
 * Event data emitted when tray hide animation completes.
 */
export interface TrayHideCompleteEvent {
  /** The tray entity that was hidden */
  trayEntity: Entity;
  /** Screws that were in the tray (for cleanup) */
  screwsInTray: Entity[];
}

/**
 * Event data emitted when a tray should shift to a new position.
 */
export interface TrayShiftEvent {
  /** The tray entity to shift */
  trayEntity: Entity;
  /** The new display order (position) */
  newDisplayOrder: number;
}

/**
 * Event data emitted when a tray should reveal.
 */
export interface TrayRevealEvent {
  /** The tray entity to reveal */
  trayEntity: Entity;
  /** The display order where it should appear */
  displayOrder: number;
}

/**
 * Event data emitted when a tray has finished revealing.
 */
export interface TrayRevealedEvent {
  /** The tray entity that was revealed, or undefined if no new tray was revealed */
  trayEntity: Entity | undefined;
}

/**
 * System for managing tray visibility transitions.
 *
 * When a tray is filled to capacity, this system orchestrates:
 * 1. Hiding the full tray (slide down)
 * 2. Shifting remaining visible trays left
 * 3. Revealing the next hidden tray
 *
 * Uses a queue to handle rapid tray completions sequentially.
 *
 * Listens for:
 * - `screw:removalComplete` - Check if tray is now full
 *
 * Emits:
 * - `tray:startHide` - Trigger hide animation
 * - `tray:startShift` - Trigger shift animation
 * - `tray:startReveal` - Trigger reveal animation
 * - `tray:revealed` - Tray has finished revealing (triggers auto-transfer)
 */
export class TrayManagementSystem extends BaseSystem {
  static readonly NAME = 'trayManagement';
  static Queries = {
    trays: { components: [TrayComponent] },
    screws: { components: [ScrewComponent] },
  };

  /** Queue of full trays waiting to be processed */
  private transitionQueue: Entity[] = [];

  /** Whether a transition is currently in progress */
  private isTransitioning = false;

  /**
   * Check if the system is currently processing or has pending transitions.
   * Used by AutoTransferSystem to avoid starting transfers during tray animations.
   * @returns True if transitions are in progress or queued
   * @example
   * if (trayManagementSystem.isBusy()) return;
   */
  public isBusy(): boolean {
    return this.isTransitioning || this.transitionQueue.length > 0;
  }

  /**
   * Initialize event listeners.
   * @example
   * system.init(); // Called automatically by ECS
   */
  init(): void {
    gameEvents.on<ScrewRemovalCompleteEvent>(
      'screw:removalComplete',
      this.handleScrewRemovalComplete
    );
    // Also check tray fullness when buffer transfers complete
    gameEvents.on<ScrewTransferCompleteEvent>(
      'screw:transferComplete',
      this.handleScrewTransferComplete
    );

    // Listen for animation completion events
    gameEvents.on('tray:hideComplete', this.handleAnimationComplete);
    gameEvents.on('tray:shiftComplete', this.handleAnimationComplete);
    gameEvents.on('tray:revealComplete', this.handleRevealComplete);
  }

  /**
   * Handle screw removal completion - check if tray is now full.
   * @param event - The screw removal complete event
   * @example
   * // Called via event listener
   */
  private handleScrewRemovalComplete = (
    event: ScrewRemovalCompleteEvent
  ): void => {
    const screw = event.screwEntity;
    // Get the screw's tray entity ID
    const screwComponent = this.getComponents<{
      screw: { trayEntityId: string; state: string };
    }>(screw).screw;

    // Only check colored trays (not buffer)
    if (screwComponent.state !== 'inTray') {
      return;
    }

    // Find the tray this screw was placed in
    const trayEntityId = screwComponent.trayEntityId;
    const tray = this.findTrayByUID(trayEntityId);
    if (!tray) return;

    const trayComponent = this.getComponents<TrayComponentAccess>(tray).tray;

    // Check if tray is now full AND no screws are still in-flight to this tray
    // We must wait for all in-flight screws to land before hiding the tray,
    // otherwise those screws won't be reparented and will remain visible
    if (trayComponent.screwCount >= trayComponent.capacity) {
      const inFlightToThisTray = this.countScrewsInFlightToTray(trayEntityId);
      if (inFlightToThisTray > 0) {
        gameTick.log(
          'TRAY',
          `${trayComponent.color} tray full but ${String(inFlightToThisTray)} screws still in-flight, waiting...`
        );
        return;
      }
      this.queueTransition(tray);
    }
  };

  /**
   * Handle screw transfer completion - check if target tray is now full.
   * Buffer transfers also fill tray slots, so we need to check for hide.
   * @param event - The screw transfer complete event
   * @example
   * // Called via event listener
   */
  private handleScrewTransferComplete = (
    event: ScrewTransferCompleteEvent
  ): void => {
    // Reuse the same logic as removal complete
    this.handleScrewRemovalComplete(event);
  };

  /**
   * Count screws currently animating toward a specific tray.
   * These are screws with state='dragging', isAnimating=true, and trayEntityId matching.
   * @param trayUID - The tray entity UID
   * @returns Number of screws in-flight to this tray
   * @example
   * const inFlight = this.countScrewsInFlightToTray('123');
   */
  private countScrewsInFlightToTray(trayUID: string): number {
    const screws = this.getEntities('screws');
    return screws.filter((entity) => {
      const screw = this.getComponents<{
        screw: { trayEntityId: string; state: string; isAnimating: boolean };
      }>(entity).screw;
      return (
        screw.isAnimating &&
        screw.state === 'dragging' &&
        screw.trayEntityId === trayUID
      );
    }).length;
  }

  /**
   * Find a tray entity by its UID.
   * @param uid - The entity UID as a string
   * @returns The tray entity, or undefined if not found
   * @example
   * const tray = this.findTrayByUID('123');
   */
  private findTrayByUID(uid: string): Entity | undefined {
    const trays = this.getEntities('trays');
    return trays.find((t) => String(t.UID) === uid);
  }

  /**
   * Queue a tray transition for processing.
   * @param tray - The tray entity to queue
   * @example
   * this.queueTransition(trayEntity);
   */
  private queueTransition(tray: Entity): void {
    // Don't queue if already in queue
    if (this.transitionQueue.includes(tray)) {
      return;
    }

    this.transitionQueue.push(tray);
    void this.processNextTransition();
  }

  /**
   * Process the next tray transition in the queue.
   * @example
   * await this.processNextTransition();
   */
  private async processNextTransition(): Promise<void> {
    if (this.isTransitioning || this.transitionQueue.length === 0) {
      return;
    }

    this.isTransitioning = true;
    const fullTray = this.transitionQueue.shift();
    if (!fullTray) {
      this.isTransitioning = false;
      return;
    }

    const fullTrayComponent =
      this.getComponents<TrayComponentAccess>(fullTray).tray;
    fullTrayComponent.isAnimating = true;

    const sortedTrays = this.getSortedTrays();
    const nextHiddenTray = this.findNextHiddenTray(sortedTrays, fullTray);

    // Hide the full tray
    await this.hideTray(fullTray);

    // Shift and reveal trays
    const traysToShift = this.findTraysToShift(
      sortedTrays,
      fullTrayComponent.displayOrder,
      fullTray
    );
    await this.shiftAndRevealTrays(traysToShift, nextHiddenTray);

    // Finalize transition
    this.finalizeTransition(fullTrayComponent, traysToShift, nextHiddenTray);
    void this.processNextTransition();
  }

  /**
   * Get all trays sorted by display order.
   * @returns Array of tray entities sorted by display order
   * @example
   * const sorted = this.getSortedTrays();
   */
  private getSortedTrays(): Entity[] {
    const allTrays = this.getEntities('trays');
    return allTrays.sort((a, b) => {
      const aOrder =
        this.getComponents<TrayComponentAccess>(a).tray.displayOrder;
      const bOrder =
        this.getComponents<TrayComponentAccess>(b).tray.displayOrder;
      return aOrder - bOrder;
    });
  }

  /**
   * Find the next hidden tray to reveal.
   * @param sortedTrays - Trays sorted by display order
   * @param fullTray - The tray that is being hidden
   * @returns The next hidden tray, or undefined if none
   * @example
   * const next = this.findNextHiddenTray(sortedTrays, fullTray);
   */
  private findNextHiddenTray(
    sortedTrays: Entity[],
    fullTray: Entity
  ): Entity | undefined {
    return sortedTrays.find((t) => {
      const comp = this.getComponents<TrayComponentAccess>(t).tray;
      return comp.displayOrder >= 2 && t !== fullTray;
    });
  }

  /**
   * Hide a tray, wait for animation, then clean up entities.
   * @param tray - The tray to hide
   * @example
   * await this.hideTray(trayEntity);
   */
  private async hideTray(tray: Entity): Promise<void> {
    const trayComp = this.getComponents<TrayComponentAccess>(tray).tray;
    gameTick.log('TRAY', `${trayComp.color} tray hidden (was full)`);

    gameEvents.emit('tray:startHide', { trayEntity: tray } as TrayHideEvent);
    const event =
      await this.waitForEventWithData<TrayHideCompleteEvent>(
        'tray:hideComplete'
      );

    // Clean up screw entities from scene
    for (const screw of event.screwsInTray) {
      this.scene.removeChild(screw as Entity2D);
    }

    // Clean up tray entity from scene
    this.scene.removeChild(tray as Entity2D);
  }

  /**
   * Find trays that need to shift left.
   * @param sortedTrays - Trays sorted by display order
   * @param currentDisplayOrder - Display order of the hiding tray
   * @param fullTray - The tray that is being hidden
   * @returns Array of trays that need to shift
   * @example
   * const toShift = this.findTraysToShift(sorted, 0, fullTray);
   */
  private findTraysToShift(
    sortedTrays: Entity[],
    currentDisplayOrder: number,
    fullTray: Entity
  ): Entity[] {
    return sortedTrays.filter((t) => {
      const comp = this.getComponents<TrayComponentAccess>(t).tray;
      return (
        comp.displayOrder > currentDisplayOrder &&
        comp.displayOrder < 2 &&
        t !== fullTray
      );
    });
  }

  /**
   * Shift trays left and reveal next hidden tray.
   * @param traysToShift - Trays to shift left
   * @param nextHiddenTray - Next tray to reveal (if any)
   * @example
   * await this.shiftAndRevealTrays(toShift, nextTray);
   */
  private async shiftAndRevealTrays(
    traysToShift: Entity[],
    nextHiddenTray: Entity | undefined
  ): Promise<void> {
    const shiftPromises = this.emitShiftEvents(traysToShift);
    const revealPromise = this.emitRevealEvent(nextHiddenTray);

    const allPromises = revealPromise
      ? [...shiftPromises, revealPromise]
      : shiftPromises;
    if (allPromises.length > 0) {
      await Promise.all(allPromises);
    }
  }

  /**
   * Emit shift events for trays.
   * @param traysToShift - Trays to shift
   * @returns Array of promises that resolve when shifts complete
   * @example
   * const promises = this.emitShiftEvents(toShift);
   */
  private emitShiftEvents(traysToShift: Entity[]): Promise<void>[] {
    const promises: Promise<void>[] = [];
    for (const tray of traysToShift) {
      const comp = this.getComponents<TrayComponentAccess>(tray).tray;
      const newOrder = comp.displayOrder - 1;
      comp.displayOrder = newOrder;
      comp.isAnimating = true;

      promises.push(this.waitForEvent('tray:shiftComplete'));
      gameEvents.emit('tray:startShift', {
        trayEntity: tray,
        newDisplayOrder: newOrder,
      } as TrayShiftEvent);
    }
    return promises;
  }

  /**
   * Emit reveal event for the next hidden tray.
   * @param nextHiddenTray - Tray to reveal (if any)
   * @returns Promise that resolves when reveal completes, or null if no tray
   * @example
   * const promise = this.emitRevealEvent(nextTray);
   */
  private emitRevealEvent(
    nextHiddenTray: Entity | undefined
  ): Promise<void> | null {
    if (!nextHiddenTray) return null;

    const nextComp =
      this.getComponents<TrayComponentAccess>(nextHiddenTray).tray;
    const newDisplayOrder = 1;
    nextComp.displayOrder = newDisplayOrder;
    nextComp.isAnimating = true;

    gameTick.log(
      'TRAY',
      `${nextComp.color} tray revealed at position ${String(newDisplayOrder)}`
    );

    const promise = this.waitForEvent('tray:revealComplete');
    gameEvents.emit('tray:startReveal', {
      trayEntity: nextHiddenTray,
      displayOrder: newDisplayOrder,
    } as TrayRevealEvent);

    return promise;
  }

  /**
   * Finalize the transition by resetting flags and emitting events.
   * @param fullTrayComponent - Component of the hidden tray
   * @param traysToShift - Trays that were shifted
   * @param nextHiddenTray - Tray that was revealed (if any)
   * @example
   * this.finalizeTransition(comp, shifted, revealed);
   */

  private finalizeTransition(
    fullTrayComponent: TrayComponentAccess['tray'],
    traysToShift: Entity[],
    nextHiddenTray: Entity | undefined
  ): void {
    gameTick.log(
      'TRAY_FINALIZE',
      `queueLen=${String(this.transitionQueue.length)} isTransitioning=${String(this.isTransitioning)}`
    );

    fullTrayComponent.displayOrder = 99;
    fullTrayComponent.isAnimating = false;

    for (const tray of traysToShift) {
      const comp = this.getComponents<TrayComponentAccess>(tray).tray;
      comp.isAnimating = false;
    }

    if (nextHiddenTray) {
      const nextComp =
        this.getComponents<TrayComponentAccess>(nextHiddenTray).tray;
      nextComp.isAnimating = false;
    }

    // Mark transition complete BEFORE emitting events
    // This ensures AutoTransferSystem.checkAutoTransfer() doesn't skip the transfer
    this.isTransitioning = false;

    gameTick.log(
      'TRAY_FINALIZE',
      '→ isTransitioning=false, emitting tray:revealed, then processNextTransition'
    );

    // Always emit tray:revealed so AutoTransferSystem can check for
    // buffer screws that can now be transferred. If there's no next hidden tray
    // to reveal, we still need to trigger the check for remaining buffer screws.
    gameEvents.emit('tray:revealed', {
      trayEntity: nextHiddenTray,
    } as TrayRevealedEvent);
  }

  /**
   * Wait for a specific event to fire.
   * @param eventName - The name of the event to wait for
   * @example
   * await this.waitForEvent('tray:hideComplete');
   */
  private waitForEvent(eventName: string): Promise<void> {
    return new Promise((resolve) => {
      const handler = (): void => {
        gameEvents.off(eventName, handler);
        resolve();
      };
      gameEvents.on(eventName, handler);
    });
  }

  /**
   * Wait for a specific event and return its data.
   * @param eventName - The name of the event to wait for
   * @returns Promise resolving to the event data
   * @example
   * const event = await this.waitForEventWithData<TrayHideCompleteEvent>('tray:hideComplete');
   */
  private waitForEventWithData<T>(eventName: string): Promise<T> {
    return new Promise((resolve) => {
      const handler = (data: T): void => {
        gameEvents.off(eventName, handler);
        resolve(data);
      };
      gameEvents.on(eventName, handler);
    });
  }

  /**
   * Handle animation completion events.
   * @example
   * // Called via event listener
   */
  private handleAnimationComplete = (): void => {
    // Events are used for promise resolution in waitForEvent
  };

  /**
   * Handle reveal completion event.
   * @example
   * // Called via event listener
   */
  private handleRevealComplete = (): void => {
    // Events are used for promise resolution in waitForEvent
  };

  /**
   * Update is a no-op for this system.
   * @param _time - The game time (unused)
   * @example
   * system.update(time); // Called automatically by ECS
   */
  update(_time: Time): void {
    // No per-frame updates needed - transitions are event-driven
  }

  /**
   * Clean up when system is destroyed.
   * @example
   * system.destroy(); // Called automatically by ECS
   */
  destroy(): void {
    gameEvents.off('screw:removalComplete', this.handleScrewRemovalComplete);
    gameEvents.off('screw:transferComplete', this.handleScrewTransferComplete);
    gameEvents.off('tray:hideComplete', this.handleAnimationComplete);
    gameEvents.off('tray:shiftComplete', this.handleAnimationComplete);
    gameEvents.off('tray:revealComplete', this.handleRevealComplete);
    this.transitionQueue = [];
    this.isTransitioning = false;
  }
}
