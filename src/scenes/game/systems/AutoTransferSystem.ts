import type { Entity, Time } from '@play-co/odie';
import { BaseSystem } from './BaseSystem';
import {
  ScrewComponent,
  TrayComponent,
  BufferTrayComponent,
} from '../components';
import { ScrewPlacementSystem } from './ScrewPlacementSystem';
import type { ScrewTransferEvent } from './AnimationSystem';
import type { TrayRevealedEvent } from './TrayManagementSystem';
import { gameEvents } from '../utils';
import type {
  ScrewComponentAccess,
  TrayComponentAccess,
  BufferTrayComponentAccess,
} from '../types';

/**
 * System for automatically transferring screws from buffer to colored trays.
 *
 * When a screw is removed and placed in a colored tray (or when a new tray
 * is revealed), this system checks if any screws in the buffer can now be
 * moved to their matching colored tray.
 *
 * Transfer rules:
 * - Screws are processed in FIFO order (first in, first out)
 * - Only one transfer happens at a time for visual clarity
 * - Transfer only occurs if the colored tray has space and is visible
 *
 * Listens for:
 * - `screw:removalComplete` - Check for auto-transfer opportunity
 * - `screw:transferComplete` - Check for more transfers
 * - `tray:revealed` - New tray revealed, check for matching buffer screws
 *
 * Emits:
 * - `screw:startTransfer` - Begin transfer animation
 */
export class AutoTransferSystem extends BaseSystem {
  static readonly NAME = 'autoTransfer';
  static Queries = {
    coloredTrays: { components: [TrayComponent] },
    bufferTrays: { components: [BufferTrayComponent] },
    screws: { components: [ScrewComponent] },
  };

  /** Flag to prevent multiple simultaneous transfers */
  private isTransferring = false;

  /** Bound handler for screw:removalComplete event */
  private handleRemovalComplete = (): void => {
    this.checkAutoTransfer();
  };

  /** Bound handler for screw:transferComplete event */
  private handleTransferComplete = (): void => {
    this.onTransferComplete();
  };

  /** Bound handler for tray:revealed event */
  private handleTrayRevealed = (): void => {
    this.checkAutoTransfer();
  };

  /**
   * Initialize event listeners.
   * @example
   * system.init(); // Called automatically by ECS
   */
  init(): void {
    gameEvents.on('screw:removalComplete', this.handleRemovalComplete);
    gameEvents.on('screw:transferComplete', this.handleTransferComplete);
    gameEvents.on<TrayRevealedEvent>('tray:revealed', this.handleTrayRevealed);
  }

  /**
   * Clean up event listeners.
   * @example
   * system.destroy(); // Called automatically by ECS
   */
  destroy(): void {
    gameEvents.off('screw:removalComplete', this.handleRemovalComplete);
    gameEvents.off('screw:transferComplete', this.handleTransferComplete);
    gameEvents.off('tray:revealed', this.handleTrayRevealed);
    this.isTransferring = false;
  }

  /**
   * Called when a transfer animation completes.
   * @example
   * this.onTransferComplete(); // Called via event
   */
  private onTransferComplete(): void {
    this.isTransferring = false;
    // Check for more transfers
    this.checkAutoTransfer();
  }

  /**
   * Check if any screws in the buffer can be transferred to colored trays.
   * @example
   * this.checkAutoTransfer();
   */
  private checkAutoTransfer(): void {
    // Skip if already transferring
    if (this.isTransferring) return;

    const bufferTray = this.getFirstEntity('bufferTrays');
    if (!bufferTray) return;

    const buffer =
      this.getComponents<BufferTrayComponentAccess>(bufferTray).bufferTray;
    if (buffer.screwIds.length === 0) return;

    // Get placement system for finding available trays
    const placementSystem = this.scene.getSystem(ScrewPlacementSystem);

    // Process buffer screws in FIFO order
    for (const screwId of buffer.screwIds) {
      const screwEntity = placementSystem.findScrewByUid(screwId);
      if (!screwEntity) continue;

      const screw = this.getComponents<ScrewComponentAccess>(screwEntity).screw;

      // Skip if screw is already animating
      if (screw.isAnimating) continue;

      const color = screw.color;
      const matchingTray = placementSystem.findAvailableColoredTray(color);

      if (matchingTray) {
        // Found a matching tray with space - initiate transfer
        this.initiateTransfer(screwEntity, matchingTray, bufferTray);
        return; // Only one transfer at a time
      }
    }
  }

  /**
   * Start the transfer animation for a screw.
   * @param screwEntity - The screw entity
   * @param targetTray - The target tray entity
   * @param bufferTray - The buffer tray entity
   * @example
   * this.initiateTransfer(screwEntity, coloredTray, bufferTray);
   */
  private initiateTransfer(
    screwEntity: Entity,
    targetTray: Entity,
    bufferTray: Entity
  ): void {
    this.isTransferring = true;

    const buffer =
      this.getComponents<BufferTrayComponentAccess>(bufferTray).bufferTray;
    const tray = this.getComponents<TrayComponentAccess>(targetTray).tray;
    const screw = this.getComponents<ScrewComponentAccess>(screwEntity).screw;

    // Remove from buffer
    const screwUid = String(screwEntity.UID);
    const bufferIndex = buffer.screwIds.indexOf(screwUid);
    if (bufferIndex >= 0) {
      buffer.screwIds.splice(bufferIndex, 1);
    }

    // Reserve slot in colored tray
    const slotIndex = tray.screwCount;
    tray.screwCount++;

    // Update screw state
    screw.isAnimating = true;

    // Emit transfer event for AnimationSystem
    const event: ScrewTransferEvent = {
      screwEntity,
      targetTray,
      slotIndex,
    };

    gameEvents.emit('screw:startTransfer', event);
  }

  /**
   * Update is a no-op for this system.
   * @param _time - Frame time info (unused)
   * @example
   * system.update(time); // Called automatically by ECS
   */
  update(_time: Time): void {
    // No per-frame updates needed - all logic is event-driven
  }
}
