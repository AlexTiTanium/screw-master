/**
 * Base class for animator modules.
 *
 * Provides shared animation utilities like timeline setup, flight animation,
 * and settle effects used by screw and tray animators.
 *
 * @module
 */

/* eslint-disable jsdoc/require-example */

import type { Entity2D } from '@play-co/odie';
import type { Sprite } from 'pixi.js';
import gsap from 'gsap';
import type { AnimatorContext, FlightParams } from './types';
import { bezierPosition } from './bezier';

/**
 * Abstract base class providing shared animation functionality.
 *
 * Animators extend this class to inherit common utilities for:
 * - GSAP timeline setup and tracking
 * - Bezier flight animations
 * - Settle/bounce effects
 * - Placeholder visibility
 *
 * @example
 * class MyAnimator extends AnimatorBase {
 *   constructor(ctx: AnimatorContext) {
 *     super(ctx);
 *   }
 *
 *   async animate(entity: Entity2D): Promise<void> {
 *     const timeline = this.setupAnimationTimeline(entity);
 *     // ... use timeline
 *   }
 * }
 */
export abstract class AnimatorBase {
  protected ctx: AnimatorContext;

  constructor(ctx: AnimatorContext) {
    this.ctx = ctx;
  }

  /**
   * Setup animation timeline and move entity to animation layer.
   * @param entity - The entity to animate
   * @returns GSAP timeline tracked in activeTimelines
   * @example
   */
  protected setupAnimationTimeline(entity: Entity2D): gsap.core.Timeline {
    const timeline = gsap.timeline();
    this.ctx.activeTimelines.add(timeline);

    const animationLayer = this.ctx.getAnimationLayer();
    if (animationLayer) {
      animationLayer.addChild(entity.view);
    }

    return timeline;
  }

  /**
   * Remove timeline from tracking after animation completes.
   * @param timeline - The timeline to cleanup
   * @example
   */
  protected cleanupTimeline(timeline: gsap.core.Timeline): void {
    this.ctx.activeTimelines.delete(timeline);
  }

  /**
   * Animate flight along bezier curve with scale interpolation.
   * @param timeline - GSAP timeline
   * @param entity - The entity to animate
   * @param sprite - The sprite visual
   * @param params - Flight parameters
   * @param duration - Animation duration in seconds
   * @example
   */
  protected async animateFlight(
    timeline: gsap.core.Timeline,
    entity: Entity2D,
    sprite: Sprite,
    params: FlightParams,
    duration: number
  ): Promise<void> {
    const progress = { t: 0 };
    const updatePosition = (): void => {
      this.updateFlightPosition(progress.t, entity, sprite, params);
    };
    await timeline.to(progress, {
      t: 1,
      duration,
      ease: 'power2.inOut',
      onUpdate: updatePosition,
    });
  }

  /**
   * Update entity position and scale during flight animation.
   * @param t - Animation progress (0-1)
   * @param entity - The entity to move
   * @param sprite - The sprite to scale
   * @param params - Flight parameters
   * @example
   */
  protected updateFlightPosition(
    t: number,
    entity: Entity2D,
    sprite: Sprite,
    params: FlightParams
  ): void {
    entity.position.x = bezierPosition(
      t,
      params.startX,
      params.controlX,
      params.endX
    );
    entity.position.y = bezierPosition(
      t,
      params.startY,
      params.controlY,
      params.endY
    );
    sprite.scale.set(
      params.startScale + (params.endScale - params.startScale) * t
    );
  }

  /**
   * Animate settle bounce at end of flight.
   * @param timeline - GSAP timeline
   * @param sprite - The sprite visual
   * @param scale - Target scale
   * @example
   */
  protected async animateSettle(
    timeline: gsap.core.Timeline,
    sprite: Sprite,
    scale: number
  ): Promise<void> {
    await timeline.to(sprite.scale, {
      x: scale,
      y: scale,
      duration: 0.1,
      ease: 'bounce.out',
    });
  }

  /**
   * Hide a placeholder sprite when a screw fills that slot.
   * @param trayEntity - The tray entity
   * @param slotIndex - The slot index that was filled
   * @example
   */
  protected hidePlaceholder(trayEntity: Entity2D, slotIndex: number): void {
    const placeholders = this.ctx.getTrayPlaceholders(trayEntity);
    const placeholder = placeholders?.[slotIndex];
    if (placeholder) {
      gsap.to(placeholder, { alpha: 0, duration: 0.15, ease: 'linear' });
    }
  }
}
