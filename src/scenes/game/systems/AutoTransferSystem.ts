import type { Entity, Time } from '@play-co/odie';
import { BaseSystem } from './BaseSystem';
import {
  ScrewComponent,
  TrayComponent,
  BufferTrayComponent,
} from '../components';
import { ScrewPlacementSystem } from './ScrewPlacementSystem';
import { TrayManagementSystem } from './TrayManagementSystem';
import type { ScrewTransferEvent } from './AnimationSystem';
import type { TrayRevealedEvent } from './TrayManagementSystem';
import { gameEvents, gameTick } from '../utils';
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

  /**
   * Bound handler for screw:removalComplete event.
   * Defers check to allow TrayManagementSystem to process first.
   * @internal
   */
  private handleRemovalComplete = (): void => {
    // Defer to allow TrayManagementSystem to set isTransitioning first
    // Both systems listen to screw:removalComplete - if a tray fills,
    // we need TrayManagement to mark itself busy before we check
    queueMicrotask(() => {
      this.checkAutoTransfer();
    });
  };

  /**
   * Bound handler for screw:transferComplete event.
   * Defers check to allow TrayManagementSystem to process first.
   * @internal
   */
  private handleTransferComplete = (): void => {
    // Defer to allow TrayManagementSystem to process tray fullness first
    queueMicrotask(() => {
      this.onTransferComplete();
    });
  };

  /**
   * Bound handler for tray:revealed event.
   * Defers check to allow TrayManagementSystem to finalize first.
   * @internal
   */
  private handleTrayRevealed = (): void => {
    // Defer to ensure tray animations are fully complete
    queueMicrotask(() => {
      this.checkAutoTransfer();
    });
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
    if (this.shouldSkipTransferCheck()) return;

    const bufferTray = this.getFirstEntity('bufferTrays');
    if (!bufferTray) return;

    const buffer =
      this.getComponents<BufferTrayComponentAccess>(bufferTray).bufferTray;
    if (buffer.screwIds.length === 0) {
      gameTick.log('AUTO_TRANSFER_CHECK', '→ skipped (buffer empty)');
      return;
    }

    this.processBufferScrews(buffer.screwIds, bufferTray);
  }

  /**
   * Check if transfer check should be skipped and log reason.
   * @returns True if should skip
   * @example
   * if (this.shouldSkipTransferCheck()) return;
   */
  private shouldSkipTransferCheck(): boolean {
    const transferring = this.isTransferring;
    const animating = this.anyTrayAnimating();
    const busy = this.trayManagementBusy();

    gameTick.log(
      'AUTO_TRANSFER_CHECK',
      `transferring=${String(transferring)} animating=${String(animating)} busy=${String(busy)}`
    );

    if (transferring) {
      gameTick.log('AUTO_TRANSFER_CHECK', '→ skipped (already transferring)');
      return true;
    }
    if (animating) {
      gameTick.log('AUTO_TRANSFER_CHECK', '→ skipped (trays animating)');
      return true;
    }
    if (busy) {
      gameTick.log('AUTO_TRANSFER_CHECK', '→ skipped (tray management busy)');
      return true;
    }
    return false;
  }

  /**
   * Process buffer screws in FIFO order, initiating transfer if possible.
   * @param screwIds - Array of screw UIDs in buffer
   * @param bufferTray - The buffer tray entity
   * @example
   * this.processBufferScrews(buffer.screwIds, bufferTray);
   */
  private processBufferScrews(screwIds: string[], bufferTray: Entity): void {
    const placementSystem = this.scene.getSystem(ScrewPlacementSystem);

    for (const screwId of screwIds) {
      const screwEntity = placementSystem.findScrewByUid(screwId);
      if (!screwEntity) continue;

      const screw = this.getComponents<ScrewComponentAccess>(screwEntity).screw;
      if (screw.isAnimating) continue;

      const matchingTray = placementSystem.findAvailableColoredTray(
        screw.color
      );
      if (matchingTray) {
        this.initiateTransfer(screwEntity, matchingTray, bufferTray);
        return; // Only one transfer at a time
      }
    }
  }

  /**
   * Check if any colored tray is currently animating.
   * Used to prevent transfers while trays are shifting/revealing.
   * @returns True if any tray is animating
   * @example
   * if (this.anyTrayAnimating()) return;
   */
  private anyTrayAnimating(): boolean {
    const coloredTrays = this.getEntities('coloredTrays');
    for (const tray of coloredTrays) {
      const trayComp = this.getComponents<TrayComponentAccess>(tray).tray;
      if (trayComp.isAnimating) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if TrayManagementSystem is processing or has pending transitions.
   * This prevents starting transfers when more tray shifts may occur.
   * @returns True if tray management is busy
   * @example
   * if (this.trayManagementBusy()) return;
   */
  private trayManagementBusy(): boolean {
    const trayManagement = this.scene.getSystem(TrayManagementSystem);
    return trayManagement.isBusy();
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

    // Log transfer action for debugging/test reproduction
    gameTick.log(
      'TRANSFER',
      `${screw.color} screw from buffer → ${tray.color} tray [slot ${String(slotIndex)}]`
    );

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
