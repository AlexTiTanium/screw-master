/**
 * Screw transfer animation handler.
 *
 * Handles the screw:startTransfer event to animate screws moving from
 * the buffer tray to a colored tray when a matching tray becomes available.
 *
 * @module
 */

/* eslint-disable jsdoc/require-returns, jsdoc/require-param, jsdoc/require-example */

import type { Entity, Entity2D } from '@play-co/odie';
import type { Sprite } from 'pixi.js';
import { AnimatorBase } from './AnimatorBase';
import type { FlightParams, ScrewTransferEvent } from './types';
import {
  BUFFER_SLOT_SCALE,
  TRAY_SLOT_SCALE,
  TRANSFER_ARC_HEIGHT,
} from './types';
import { gameEvents, gameTick } from '../../utils';

/** Component access type for screw entities */
interface ScrewComponentAccess {
  screw: {
    color: string;
    state: string;
    trayEntityId?: string;
    slotIndex?: number;
    isAnimating: boolean;
  };
}

/** Component access type for tray entities */
interface TrayComponentAccess {
  tray: {
    displayOrder: number;
    capacity: number;
    color: string;
    isAnimating: boolean;
  };
}

/**
 * Animator for screw transfer (buffer to colored tray).
 *
 * When a screw is in the buffer tray and its matching colored tray becomes
 * available, this animator handles the arc flight animation to move the
 * screw from buffer to the colored tray slot.
 *
 * Uses a faster animation (0.27s) than removal since the screw is already
 * in its long form and doesn't need texture swapping.
 *
 * Emits `screw:transferComplete` when animation finishes.
 *
 * @example
 * const animator = new ScrewTransferAnimator(ctx);
 * await animator.handle(event);
 */
export class ScrewTransferAnimator extends AnimatorBase {
  /**
   * Handle screw transfer animation (buffer to colored tray).
   * @param event - The transfer event data
   */
  async handle(event: ScrewTransferEvent): Promise<void> {
    const { screwEntity, targetTray, slotIndex } = event;
    const screwEntity2D = screwEntity as Entity2D;
    const visual = this.ctx.getGameVisual(screwEntity2D);

    // Disable pointer events during animation
    screwEntity2D.view.eventMode = 'none';

    if (!visual) {
      this.complete(screwEntity, targetTray, slotIndex);
      return;
    }

    const timeline = this.setupAnimationTimeline(screwEntity2D);

    try {
      await this.executeAnimation(screwEntity2D, visual, event, timeline);
    } finally {
      this.cleanupTimeline(timeline);
    }

    this.complete(screwEntity, targetTray, slotIndex);
  }

  /** Execute the transfer animation phases. */
  private async executeAnimation(
    entity: Entity2D,
    sprite: Sprite,
    event: ScrewTransferEvent,
    timeline: gsap.core.Timeline
  ): Promise<void> {
    const { targetTray, slotIndex } = event;
    const startPos = { x: entity.position.x, y: entity.position.y };

    // Use displayOrder-based targeting for correct position even during shifts
    const tray = this.ctx.getComponents<TrayComponentAccess>(targetTray).tray;
    const targetPos = this.ctx.getTraySlotTargetPosition(
      tray.displayOrder,
      slotIndex,
      tray.capacity
    );
    const params = this.createTransferFlightParams(startPos, targetPos);

    // Transfer animation: 1.5x faster than removal (0.4 / 1.5 ≈ 0.27s)
    await this.animateFlight(timeline, entity, sprite, params, 0.27);
    await this.animateSettle(timeline, sprite, TRAY_SLOT_SCALE);
  }

  /** Create flight parameters for transfer animation (no pop-out). */
  private createTransferFlightParams(
    start: { x: number; y: number },
    end: { x: number; y: number }
  ): FlightParams {
    return {
      startX: start.x,
      startY: start.y,
      controlX: (start.x + end.x) / 2,
      controlY: Math.min(start.y, end.y) - TRANSFER_ARC_HEIGHT,
      endX: end.x,
      endY: end.y,
      startScale: BUFFER_SLOT_SCALE,
      endScale: TRAY_SLOT_SCALE,
    };
  }

  /** Complete the transfer and emit event. */
  private complete(
    screwEntity: Entity,
    targetTray: Entity,
    slotIndex: number
  ): void {
    const screw =
      this.ctx.getComponents<ScrewComponentAccess>(screwEntity).screw;
    screw.state = 'inTray';
    screw.trayEntityId = String(targetTray.UID);
    screw.slotIndex = slotIndex;
    screw.isAnimating = false;

    const screwEntity2D = screwEntity as Entity2D;

    // Move screw view to coloredTrayLayer after animation
    const coloredTrayLayer = this.ctx.getColoredTrayLayer();
    if (coloredTrayLayer) {
      coloredTrayLayer.addChild(screwEntity2D.view);
    }

    // Check if position matches expected - logs warning if mismatch
    this.checkScrewPosition(screwEntity2D, targetTray, slotIndex);

    // Hide placeholder when screw lands in colored tray
    this.hidePlaceholder(targetTray as Entity2D, slotIndex);

    gameEvents.emit('screw:transferComplete', { screwEntity });
  }

  /** Check if screw position matches expected slot position. */
  private checkScrewPosition(
    screwEntity: Entity2D,
    targetTray: Entity,
    slotIndex: number
  ): void {
    const screw =
      this.ctx.getComponents<ScrewComponentAccess>(screwEntity).screw;
    const tray = this.ctx.getComponents<TrayComponentAccess>(targetTray).tray;
    const expected = this.ctx.getTraySlotTargetPosition(
      tray.displayOrder,
      slotIndex,
      tray.capacity
    );
    const dX = Math.abs(screwEntity.position.x - expected.x);
    const dY = Math.abs(screwEntity.position.y - expected.y);

    if (dX > 0.5 || dY > 0.5) {
      gameTick.warn(
        'POSITION_MISMATCH',
        `${screw.color} screw at (${screwEntity.position.x.toFixed(1)}, ${screwEntity.position.y.toFixed(1)}) ` +
          `expected (${String(expected.x)}, ${String(expected.y)}) ` +
          `delta=(${dX.toFixed(1)}, ${dY.toFixed(1)}) ` +
          `tray.displayOrder=${String(tray.displayOrder)} tray.isAnimating=${String(tray.isAnimating)}`
      );
    }
  }
}
