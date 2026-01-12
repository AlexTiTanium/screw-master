import type { Entity, Time } from '@play-co/odie';
import { BaseSystem } from './BaseSystem';
import {
  ScrewComponent,
  TrayComponent,
  BufferTrayComponent,
} from '../components';
import type { ScrewColor } from '@shared/types';
import type {
  ScrewComponentAccess,
  TrayComponentAccess,
  BufferTrayComponentAccess,
} from '../types';
import { TrayManagementSystem } from './TrayManagementSystem';
import { gameTick } from '../utils';

/**
 * Placement target information.
 */
export interface PlacementTarget {
  /** Type of target tray */
  type: 'colored' | 'buffer';
  /** The tray entity */
  tray: Entity;
  /** Slot index in the tray (0-based) */
  slotIndex: number;
}

/**
 * System for determining screw placement in trays.
 *
 * This system provides the logic for finding valid placement targets
 * for screws and managing tray occupancy. It does not handle animations
 * or user interaction - those are handled by other systems.
 *
 * Placement priority:
 * 1. Matching colored tray (if visible and has space)
 * 2. Buffer tray (if has space)
 * 3. No valid placement (soft lock)
 *
 * @example
 * // In another system
 * const placement = this.scene.getSystem(ScrewPlacementSystem);
 * const target = placement.findPlacementTarget(ScrewColor.Red);
 * if (target) {
 *   placement.reserveSlot(target, screwEntity);
 * }
 */
export class ScrewPlacementSystem extends BaseSystem {
  static readonly NAME = 'screwPlacement';
  static Queries = {
    coloredTrays: { components: [TrayComponent] },
    bufferTrays: { components: [BufferTrayComponent] },
    screws: { components: [ScrewComponent] },
  };

  /**
   * Find a valid placement target for a screw of the given color.
   *
   * Visible trays have displayOrder < 2 (positions 0 and 1).
   * During tray animations, screws are forced to buffer to prevent misplacement.
   *
   * @param color - The screw color to find placement for
   * @returns PlacementTarget if found, null if no valid placement
   * @example
   * const target = system.findPlacementTarget(ScrewColor.Red);
   */
  // eslint-disable-next-line max-lines-per-function -- debug logging adds lines
  findPlacementTarget(color: ScrewColor): PlacementTarget | null {
    const animating = this.anyTrayAnimating();
    const busy = this.trayManagementBusy();

    gameTick.log(
      'PLACEMENT',
      `${color} screw → animating=${String(animating)} busy=${String(busy)}`
    );

    // During tray animations OR transition queue processing, force buffer-only
    // This prevents race conditions when transitions are queued but not yet started
    if (!animating && !busy) {
      const coloredTarget = this.findColoredTrayTarget(color);
      if (coloredTarget) {
        const tray = this.getComponents<TrayComponentAccess>(
          coloredTarget.tray
        ).tray;
        gameTick.log(
          'PLACEMENT',
          `→ ${tray.color} tray [slot ${String(coloredTarget.slotIndex)}]`
        );
        return coloredTarget;
      }
    }

    const bufferTarget = this.findBufferTrayTarget();
    if (bufferTarget) {
      gameTick.log(
        'PLACEMENT',
        `→ buffer [slot ${String(bufferTarget.slotIndex)}]`
      );
    } else {
      gameTick.log('PLACEMENT', '→ NO VALID TARGET');
    }
    return bufferTarget;
  }

  /**
   * Check if TrayManagementSystem is processing or has pending transitions.
   * @returns True if tray management is busy
   * @example
   * if (system.trayManagementBusy()) { ... }
   */
  trayManagementBusy(): boolean {
    const trayManagement = this.scene.getSystem(TrayManagementSystem);
    return trayManagement.isBusy();
  }

  /**
   * Check if any colored tray is currently animating.
   * When true, screws should go to buffer instead of colored trays.
   * @returns True if any tray is animating
   * @example
   * if (system.anyTrayAnimating()) { ... }
   */
  anyTrayAnimating(): boolean {
    const coloredTrays = this.getEntities('coloredTrays');
    return coloredTrays.some((entity) => {
      const tray = this.getComponents<TrayComponentAccess>(entity).tray;
      return tray.isAnimating;
    });
  }

  /**
   * Check if buffer tray is full, including screws in-flight to buffer.
   * Counts both screws already in buffer AND screws animating toward it.
   * @returns True if buffer cannot accept more screws
   * @example
   * if (system.isBufferFull()) { ... }
   */
  isBufferFull(): boolean {
    const bufferTray = this.getFirstEntity('bufferTrays');
    if (!bufferTray) return true;

    const buffer =
      this.getComponents<BufferTrayComponentAccess>(bufferTray).bufferTray;
    const inBuffer = buffer.screwIds.length;
    const inFlight = this.countScrewsAnimatingToBuffer();

    return inBuffer + inFlight >= buffer.capacity;
  }

  /**
   * Count screws currently animating toward the buffer tray.
   * @returns Number of screws in-flight to buffer
   * @example
   * const inFlight = this.countScrewsAnimatingToBuffer();
   */
  private countScrewsAnimatingToBuffer(): number {
    const bufferTray = this.getFirstEntity('bufferTrays');
    if (!bufferTray) return 0;

    const bufferUid = String(bufferTray.UID);
    const screws = this.getEntities('screws');

    return screws.filter((entity) => {
      const screw = this.getComponents<ScrewComponentAccess>(entity).screw;
      return (
        screw.isAnimating &&
        screw.state === 'dragging' &&
        screw.trayEntityId === bufferUid
      );
    }).length;
  }

  /**
   * Find a matching colored tray with space.
   * @param color - The screw color
   * @returns Placement target or null if none found
   * @example
   * const target = this.findColoredTrayTarget(ScrewColor.Blue);
   */
  private findColoredTrayTarget(color: ScrewColor): PlacementTarget | null {
    const coloredTrays = this.getEntities('coloredTrays');
    const matchingTray = coloredTrays.find((entity) => {
      const tray = this.getComponents<TrayComponentAccess>(entity).tray;
      return (
        tray.color === color &&
        tray.displayOrder < 2 &&
        !tray.isAnimating &&
        tray.screwCount < tray.capacity
      );
    });

    if (!matchingTray) return null;
    const tray = this.getComponents<TrayComponentAccess>(matchingTray).tray;
    return { type: 'colored', tray: matchingTray, slotIndex: tray.screwCount };
  }

  /**
   * Find the buffer tray if it has space.
   * @returns Placement target or null if buffer is full
   * @example
   * const target = this.findBufferTrayTarget();
   */
  private findBufferTrayTarget(): PlacementTarget | null {
    const bufferTray = this.getFirstEntity('bufferTrays');
    if (!bufferTray) return null;

    const buffer =
      this.getComponents<BufferTrayComponentAccess>(bufferTray).bufferTray;
    if (buffer.screwIds.length >= buffer.capacity) return null;

    return {
      type: 'buffer',
      tray: bufferTray,
      slotIndex: buffer.screwIds.length,
    };
  }

  /**
   * Reserve a slot in the target tray for a screw.
   *
   * This should be called immediately when a screw starts its removal
   * animation to prevent race conditions with multiple screws.
   *
   * @param target - The placement target from findPlacementTarget
   * @param screwEntity - The screw entity being placed
   * @example
   * system.reserveSlot(target, screwEntity);
   */
  reserveSlot(target: PlacementTarget, screwEntity: Entity): void {
    const screw = this.getComponents<ScrewComponentAccess>(screwEntity).screw;

    if (target.type === 'colored') {
      // Increment colored tray count
      const tray = this.getComponents<TrayComponentAccess>(target.tray).tray;
      tray.screwCount++;
    } else {
      // Add to buffer tray FIFO list
      const buffer = this.getComponents<BufferTrayComponentAccess>(
        target.tray
      ).bufferTray;
      buffer.screwIds.push(String(screwEntity.UID));
    }

    // Update screw component
    screw.trayEntityId = String(target.tray.UID);
    screw.slotIndex = target.slotIndex;
  }

  /**
   * Find a colored tray with available space for the given color.
   *
   * Used by AutoTransferSystem to check if buffer screws can be moved.
   * Only considers visible trays (displayOrder < 2) that are not animating.
   *
   * @param color - The screw color to find a tray for
   * @returns The tray entity if found, null otherwise
   * @example
   * const tray = system.findAvailableColoredTray(ScrewColor.Green);
   */
  findAvailableColoredTray(color: ScrewColor): Entity | null {
    const coloredTrays = this.getEntities('coloredTrays');
    return (
      coloredTrays.find((entity) => {
        const tray = this.getComponents<TrayComponentAccess>(entity).tray;
        return (
          tray.color === color &&
          tray.displayOrder < 2 && // Only visible trays
          !tray.isAnimating &&
          tray.screwCount < tray.capacity
        );
      }) ?? null
    );
  }

  /**
   * Find a screw entity by its UID.
   *
   * @param uid - The entity UID as a string
   * @returns The screw entity if found, undefined otherwise
   * @example
   * const screw = system.findScrewByUid('123');
   */
  findScrewByUid(uid: string): Entity | undefined {
    const screws = this.getEntities('screws');
    return screws.find((entity) => String(entity.UID) === uid);
  }

  /**
   * Check if any valid moves are available.
   *
   * Used by WinConditionSystem to detect soft lock state.
   *
   * @returns true if at least one screw in board can be placed
   * @example
   * const canMove = system.hasValidMoves();
   */
  hasValidMoves(): boolean {
    const screws = this.getEntities('screws');

    return screws.some((entity) => {
      const screw = this.getComponents<ScrewComponentAccess>(entity).screw;
      if (screw.state !== 'inBoard' || screw.isAnimating) {
        return false;
      }
      return this.findPlacementTarget(screw.color) !== null;
    });
  }

  /**
   * Update is a no-op for this system.
   * All logic is triggered by other systems calling methods directly.
   * @param _time - Frame time info (unused)
   * @example
   * system.update(time); // Called automatically by ECS
   */
  update(_time: Time): void {
    // No per-frame updates needed
  }
}
