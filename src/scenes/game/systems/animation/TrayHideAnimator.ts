/**
 * Tray hide animation handler.
 *
 * Handles the tray:startHide event to scale down and hide a filled tray.
 * Reparents screws to the tray view so they scale together during the
 * hide animation.
 *
 * @module
 */

/* eslint-disable jsdoc/require-example */

import type { Entity, Entity2D } from '@play-co/odie';
import gsap from 'gsap';
import type { AnimatorContext } from './types';
import { gameEvents } from '../../utils';
import type { TrayHideEvent } from '../TrayManagementSystem';

/**
 * Animator for tray hide (scale down and disappear).
 *
 * When a tray fills up completely, it animates out with a scale-to-zero
 * effect. The screws in the tray are reparented to the tray's view so
 * they shrink together as a unit.
 *
 * Emits `tray:hideComplete` when animation finishes.
 *
 * @example
 * const animator = new TrayHideAnimator(ctx);
 * await animator.handle(event);
 */
export class TrayHideAnimator {
  private ctx: AnimatorContext;

  constructor(ctx: AnimatorContext) {
    this.ctx = ctx;
  }

  /**
   * Handle tray hide animation with scale-down effect.
   * @param event - The tray hide event data
   * @example
   */
  async handle(event: TrayHideEvent): Promise<void> {
    const { trayEntity } = event;
    const entity2D = trayEntity as Entity2D;
    const screwsInTray = this.ctx.getScrewsInTray(String(trayEntity.UID));

    this.reparentScrewsToTray(screwsInTray, entity2D);
    this.setupPivotForCenterScale(entity2D);
    await this.animateScaleDown(entity2D);

    gameEvents.emit('tray:hideComplete', { trayEntity, screwsInTray });
  }

  /**
   * Set up tray pivot for center-based scaling animation.
   * Adjusts position to compensate for pivot change.
   * @param entity - The tray entity
   * @example
   */
  private setupPivotForCenterScale(entity: Entity2D): void {
    // Tray dimensions: 185x150
    const pivotX = 185 / 2;
    const pivotY = 150 / 2;
    entity.view.pivot.set(pivotX, pivotY);
    entity.position.x += pivotX;
    entity.position.y += pivotY;
  }

  /**
   * Animate tray scale-down smoothly from 1 to 0.
   * @param entity - The tray entity to animate
   * @example
   */
  private async animateScaleDown(entity: Entity2D): Promise<void> {
    const timeline = gsap.timeline();
    this.ctx.activeTimelines.add(timeline);

    try {
      // Single smooth scale animation from 1 → 0
      await timeline.to(entity.scale, {
        x: 0,
        y: 0,
        duration: 0.4,
        ease: 'power2.in',
      });
    } finally {
      this.ctx.activeTimelines.delete(timeline);
    }
  }

  /**
   * Reparent screw visuals to tray view so they scale together.
   * Converts screw positions to tray-local coordinates.
   * @param screws - Array of screw entities to reparent
   * @param trayEntity - The tray entity to parent screws to
   * @example
   */
  private reparentScrewsToTray(screws: Entity[], trayEntity: Entity2D): void {
    // Use trayEntity.view (the container) instead of the tray sprite
    // This is because we scale trayEntity.scale, not the sprite
    const trayView = trayEntity.view;

    for (const screwEntity of screws) {
      const screwEntity2D = screwEntity as Entity2D;
      const screwVisual = this.ctx.getGameVisual(screwEntity2D);
      if (!screwVisual) continue;

      // Calculate local position relative to tray
      // Screw is at entity world position, tray is at tray entity position
      // Local position = screw world position - tray world position
      const localX = screwEntity2D.position.x - trayEntity.position.x;
      const localY = screwEntity2D.position.y - trayEntity.position.y;

      // Remove from current parent first to avoid PixiJS warning
      if (screwVisual.parent) {
        screwVisual.parent.removeChild(screwVisual);
      }

      // Reparent visual to tray view container
      screwVisual.position.set(localX, localY);
      trayView.addChild(screwVisual);
    }
  }
}
