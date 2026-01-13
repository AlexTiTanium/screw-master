/**
 * Tray reveal animation handler.
 *
 * Handles the tray:startReveal event to slide a tray in from the right
 * when a hidden tray needs to become visible after another tray is filled.
 *
 * @module
 */

/* eslint-disable jsdoc/require-example */

import type { Entity2D } from '@play-co/odie';
import gsap from 'gsap';
import type { AnimatorContext } from './types';
import { gameEvents, TRAY_DISPLAY_POSITIONS, TRAY_SPAWN_X } from '../../utils';
import type { TrayRevealEvent } from '../TrayManagementSystem';

/**
 * Animator for tray reveal (slide in from right).
 *
 * When a tray fills up and hides, the next hidden tray slides in from the
 * right side to take its place. This animator handles that transition.
 *
 * Emits `tray:revealComplete` when animation finishes.
 *
 * @example
 * const animator = new TrayRevealAnimator(ctx);
 * await animator.handle(event);
 */
export class TrayRevealAnimator {
  private ctx: AnimatorContext;

  constructor(ctx: AnimatorContext) {
    this.ctx = ctx;
  }

  /**
   * Handle tray reveal animation (slide in from right).
   * @param event - The tray reveal event data
   * @example
   */
  async handle(event: TrayRevealEvent): Promise<void> {
    const { trayEntity, displayOrder } = event;
    const entity2D = trayEntity as Entity2D;
    const targetPos = TRAY_DISPLAY_POSITIONS[displayOrder];

    if (!targetPos) {
      gameEvents.emit('tray:revealComplete', { trayEntity });
      return;
    }

    // Start tray at rightmost covered slot position (hidden under cover)
    entity2D.position.x = TRAY_SPAWN_X;
    entity2D.position.y = targetPos.y;

    const timeline = gsap.timeline();
    this.ctx.activeTimelines.add(timeline);

    try {
      await timeline.to(entity2D.position, {
        x: targetPos.x,
        duration: 0.3,
        ease: 'power2.out',
      });
    } finally {
      this.ctx.activeTimelines.delete(timeline);
    }

    gameEvents.emit('tray:revealComplete', { trayEntity });
  }
}
