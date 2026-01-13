/**
 * Screw removal animation handler.
 *
 * Handles the screw:startRemoval event to animate screws being removed
 * from parts and flying to their target tray (buffer or colored).
 *
 * @module
 */

/* eslint-disable jsdoc/require-returns, jsdoc/require-param, jsdoc/require-example */

import type { Entity, Entity2D } from '@play-co/odie';
import { Assets, type Sprite, type Texture } from 'pixi.js';
import { AnimatorBase } from './AnimatorBase';
import type { FlightParams } from './types';
import {
  LONG_SCREW_ASSET_MAP,
  TRAY_SLOT_SCALE,
  BUFFER_SLOT_SCALE,
  POP_OUT_SCALE,
  POP_OUT_HEIGHT,
  REMOVAL_ARC_HEIGHT,
} from './types';
import { gameEvents, gameTick } from '../../utils';
import type { ScrewRemovalEvent } from '../ScrewInteractionSystem';
import type { ScrewColor } from '@shared/types';

/** Component access type for screw entities */
interface ScrewComponentAccess {
  screw: {
    color: ScrewColor;
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
 * Animator for screw removal (unscrew and fly to tray).
 *
 * Animation sequence:
 * 1. Swap texture from short screw to long screw
 * 2. Arc flight along bezier curve to target tray slot
 * 3. Settle bounce effect at landing
 *
 * Can target either buffer tray (when no matching colored tray is visible)
 * or colored tray (when a matching tray has space).
 *
 * Emits `screw:removalComplete` when animation finishes.
 *
 * @example
 * const animator = new ScrewRemovalAnimator(ctx);
 * await animator.handle(event);
 */
export class ScrewRemovalAnimator extends AnimatorBase {
  /**
   * Handle screw removal animation.
   * @param event - The removal event data
   */
  async handle(event: ScrewRemovalEvent): Promise<void> {
    const { screwEntity, targetTray, slotIndex, isBuffer } = event;
    const screwEntity2D = screwEntity as Entity2D;
    const visual = this.ctx.getGameVisual(screwEntity2D);

    // Disable pointer events during animation
    screwEntity2D.view.eventMode = 'none';

    if (!visual) {
      this.complete(screwEntity, isBuffer, targetTray, slotIndex);
      return;
    }

    await this.animateRemoval(screwEntity2D, visual, event);
    this.complete(screwEntity, isBuffer, targetTray, slotIndex);
  }

  /** Perform the removal animation sequence. */
  private async animateRemoval(
    entity: Entity2D,
    sprite: Sprite,
    event: ScrewRemovalEvent
  ): Promise<void> {
    const timeline = this.setupAnimationTimeline(entity);

    try {
      await this.executeAnimation(entity, sprite, event, timeline);
    } finally {
      this.cleanupTimeline(timeline);
    }
  }

  /** Execute the removal animation phases. */
  private async executeAnimation(
    entity: Entity2D,
    sprite: Sprite,
    event: ScrewRemovalEvent,
    timeline: gsap.core.Timeline
  ): Promise<void> {
    const { targetTray, slotIndex, isBuffer } = event;
    const screw = this.ctx.getComponents<ScrewComponentAccess>(entity).screw;
    await this.swapToLongScrew(sprite, screw.color);

    const startPos = { x: entity.position.x, y: entity.position.y };
    // For colored trays, use displayOrder-based target to handle tray shifts during flight
    // For buffer trays, use current tray position (buffer doesn't shift)
    const targetPos = isBuffer
      ? this.getSlotTargetPosition(targetTray, slotIndex, isBuffer)
      : this.getColoredTrayTargetPosition(targetTray, slotIndex);

    const endScale = isBuffer ? BUFFER_SLOT_SCALE : TRAY_SLOT_SCALE;
    const params = this.createFlightParams(
      startPos,
      targetPos,
      endScale,
      REMOVAL_ARC_HEIGHT
    );

    await this.animateFlight(timeline, entity, sprite, params, 0.45);
    await this.animateSettle(timeline, sprite, endScale);
  }

  /** Swap screw texture to long screw variant. */
  private async swapToLongScrew(
    sprite: Sprite,
    color: ScrewColor
  ): Promise<void> {
    sprite.scale.set(POP_OUT_SCALE);
    const longTexture = await Assets.load<Texture>(LONG_SCREW_ASSET_MAP[color]);
    sprite.texture = longTexture;
  }

  /** Create flight parameters for bezier animation. */
  private createFlightParams(
    start: { x: number; y: number },
    end: { x: number; y: number },
    endScale: number,
    arcHeight: number
  ): FlightParams {
    const flightStartY = start.y - POP_OUT_HEIGHT;
    return {
      startX: start.x,
      startY: flightStartY,
      controlX: (start.x + end.x) / 2,
      controlY: Math.min(flightStartY, end.y) - arcHeight,
      endX: end.x,
      endY: end.y,
      startScale: POP_OUT_SCALE,
      endScale,
    };
  }

  /** Get target position for colored tray using displayOrder. */
  private getColoredTrayTargetPosition(
    targetTray: Entity,
    slotIndex: number
  ): { x: number; y: number } {
    const tray = this.ctx.getComponents<TrayComponentAccess>(targetTray).tray;
    return this.ctx.getTraySlotTargetPosition(
      tray.displayOrder,
      slotIndex,
      tray.capacity
    );
  }

  /** Get the target position for a slot in a tray. */
  private getSlotTargetPosition(
    targetTray: Entity,
    slotIndex: number,
    isBuffer: boolean
  ): { x: number; y: number } {
    const trayCapacity = isBuffer
      ? undefined
      : this.ctx.getComponents<TrayComponentAccess>(targetTray).tray.capacity;
    return this.ctx.getTraySlotPosition(
      targetTray as Entity2D,
      slotIndex,
      isBuffer,
      trayCapacity
    );
  }

  /** Complete the removal and emit event. */
  private complete(
    screwEntity: Entity,
    isBuffer: boolean,
    targetTray?: Entity,
    slotIndex?: number
  ): void {
    const screw =
      this.ctx.getComponents<ScrewComponentAccess>(screwEntity).screw;
    screw.state = isBuffer ? 'inBuffer' : 'inTray';
    screw.isAnimating = false;

    const screwEntity2D = screwEntity as Entity2D;
    if (!isBuffer) {
      // Colored tray: move to layer and snap to final position
      const coloredTrayLayer = this.ctx.getColoredTrayLayer();
      if (coloredTrayLayer) {
        coloredTrayLayer.addChild(screwEntity2D.view);
      }
      if (targetTray && slotIndex !== undefined) {
        this.checkScrewPosition(screwEntity2D, targetTray, slotIndex);
        this.hidePlaceholder(targetTray as Entity2D, slotIndex);
      }
    }
    // Buffer tray: leave in animation layer (above uiLayer)

    gameEvents.emit('screw:removalComplete', { screwEntity });
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
