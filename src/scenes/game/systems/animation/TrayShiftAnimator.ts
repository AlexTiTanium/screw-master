/**
 * Tray shift animation handler.
 *
 * Handles the tray:startShift event to slide a tray left to a new display
 * position when another tray hides. Also moves any screws in the tray so
 * they stay aligned.
 *
 * @module
 */

/* eslint-disable jsdoc/require-example */

import type { Entity, Entity2D } from '@play-co/odie';
import gsap from 'gsap';
import type { AnimatorContext } from './types';
import { gameEvents, TRAY_DISPLAY_POSITIONS } from '../../utils';
import type { TrayShiftEvent } from '../TrayManagementSystem';

/**
 * Animator for tray shift (slide left to new position).
 *
 * When a tray at displayOrder 0 hides, the tray at displayOrder 1 shifts
 * left to take its place. This animator handles both the tray movement
 * and any screws currently in that tray.
 *
 * Emits `tray:shiftComplete` when animation finishes.
 *
 * @example
 * const animator = new TrayShiftAnimator(ctx);
 * await animator.handle(event);
 */
export class TrayShiftAnimator {
  private ctx: AnimatorContext;

  constructor(ctx: AnimatorContext) {
    this.ctx = ctx;
  }

  /**
   * Handle tray shift animation (slide left to new position).
   * @param event - The tray shift event data
   * @example
   */
  async handle(event: TrayShiftEvent): Promise<void> {
    const { trayEntity, newDisplayOrder } = event;
    const entity2D = trayEntity as Entity2D;
    const targetPos = TRAY_DISPLAY_POSITIONS[newDisplayOrder];

    if (!targetPos) {
      gameEvents.emit('tray:shiftComplete', { trayEntity });
      return;
    }

    const screwsInTray = this.ctx.getScrewsInTray(String(trayEntity.UID));
    const deltaX = targetPos.x - entity2D.position.x;

    const timeline = gsap.timeline();
    this.ctx.activeTimelines.add(timeline);

    try {
      this.addShiftAnimations(
        timeline,
        entity2D,
        targetPos.x,
        screwsInTray,
        deltaX
      );
      await timeline;
    } finally {
      this.ctx.activeTimelines.delete(timeline);
    }

    gameEvents.emit('tray:shiftComplete', { trayEntity });
  }

  /**
   * Add tray and screw shift animations to a timeline.
   * @param timeline - GSAP timeline
   * @param trayEntity - The tray entity to animate
   * @param targetX - Target X position for tray
   * @param screws - Screws in the tray to move
   * @param deltaX - X distance to move
   * @example
   */
  private addShiftAnimations(
    timeline: gsap.core.Timeline,
    trayEntity: Entity2D,
    targetX: number,
    screws: Entity[],
    deltaX: number
  ): void {
    timeline.to(
      trayEntity.position,
      { x: targetX, duration: 0.3, ease: 'power2.inOut' },
      0
    );

    for (const screwEntity of screws) {
      const screw2D = screwEntity as Entity2D;
      timeline.to(
        screw2D.position,
        { x: screw2D.position.x + deltaX, duration: 0.3, ease: 'power2.inOut' },
        0
      );
    }
  }
}
