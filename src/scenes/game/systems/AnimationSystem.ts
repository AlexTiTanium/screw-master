import type { Entity, Entity2D, Time } from '@play-co/odie';
import { Assets, type Sprite, type Texture } from 'pixi.js';
import gsap from 'gsap';
import { BaseSystem } from './BaseSystem';
import { ScrewComponent } from '../components';
import { getGameVisual } from '../factories';
import { getTraySlotPosition, gameEvents } from '../utils';
import type { ScrewRemovalEvent } from './ScrewInteractionSystem';
import { ScrewColor } from '@shared/types';
import type { ScrewComponentAccess } from '../types';

/**
 * Event data emitted when a screw removal animation completes.
 */
export interface ScrewRemovalCompleteEvent {
  /** The screw entity that was removed */
  screwEntity: Entity;
}

/**
 * Event data for screw transfer animation (buffer to colored tray).
 */
export interface ScrewTransferEvent {
  /** The screw entity being transferred */
  screwEntity: Entity;
  /** The target colored tray entity */
  targetTray: Entity;
  /** Slot index in the target tray */
  slotIndex: number;
}

/**
 * Maps screw color to long screw asset alias.
 */
const LONG_SCREW_ASSET_MAP: Record<ScrewColor, string> = {
  [ScrewColor.Red]: 'screw-red',
  [ScrewColor.Yellow]: 'screw-yellow',
  [ScrewColor.Green]: 'screw-green',
  [ScrewColor.Blue]: 'screw-blue',
};

/**
 * Scale factor for screws in colored tray slots.
 * Long screw is 80x100, tray slot is 50x50, so ~0.5 scale fits well.
 */
const TRAY_SLOT_SCALE = 0.5;

/**
 * Scale factor for screws in buffer tray (keep full size).
 */
const BUFFER_SLOT_SCALE = 1.0;

/** Pop-out animation height in pixels. */
const POP_OUT_HEIGHT = 20;

/** Scale during pop-out phase. */
const POP_OUT_SCALE = 0.8;

/** Arc height offset for bezier control point. */
const REMOVAL_ARC_HEIGHT = 130;

/** Arc height offset for transfer bezier control point. */
const TRANSFER_ARC_HEIGHT = 80;

/**
 * Animation parameters for bezier curve flight.
 */
interface FlightParams {
  startX: number;
  startY: number;
  controlX: number;
  controlY: number;
  endX: number;
  endY: number;
  startScale: number;
  endScale: number;
}

/**
 * Calculate quadratic bezier position at parameter t.
 * @param t - Parameter from 0 to 1
 * @param p0 - Start point
 * @param p1 - Control point
 * @param p2 - End point
 * @returns Position at parameter t
 * @example
 */
function bezierPosition(t: number, p0: number, p1: number, p2: number): number {
  const invT = 1 - t;
  return invT * invT * p0 + 2 * invT * t * p1 + t * t * p2;
}

/**
 * System for handling screw animations.
 *
 * This system listens for removal and transfer events and animates
 * screws using GSAP tweens.
 *
 * Animation sequence for removal:
 * 1. Unscrew phase (0.4s): Rotate 720 degrees + scale up
 * 2. Swap texture: Short screw to long screw
 * 3. Flight phase (0.5s): Arc trajectory to target tray
 * 4. Settle phase (0.1s): Bounce effect
 *
 * Listens for:
 * - `screw:startRemoval` - Begin removal animation
 * - `screw:startTransfer` - Begin transfer animation (buffer to tray)
 *
 * Emits:
 * - `screw:removalComplete` - When removal animation finishes
 * - `screw:transferComplete` - When transfer animation finishes
 */
export class AnimationSystem extends BaseSystem {
  static readonly NAME = 'animation';
  static Queries = {
    screws: { components: [ScrewComponent] },
  };

  /** Active GSAP timelines for cleanup */
  private activeTimelines = new Set<gsap.core.Timeline>();

  /**
   * Initialize event listeners.
   * @example
   */
  init(): void {
    gameEvents.on<ScrewRemovalEvent>('screw:startRemoval', (event) => {
      void this.handleRemoval(event);
    });
    gameEvents.on<ScrewTransferEvent>('screw:startTransfer', (event) => {
      void this.handleTransfer(event);
    });
  }

  /**
   * Handle screw removal animation.
   * @param event - The removal event data
   * @example
   */
  private async handleRemoval(event: ScrewRemovalEvent): Promise<void> {
    const { screwEntity, targetTray, slotIndex, isBuffer } = event;
    const screwEntity2D = screwEntity as Entity2D;
    const visual = getGameVisual(screwEntity2D);

    if (!visual) {
      this.completeRemoval(screwEntity, isBuffer);
      return;
    }

    const sprite = visual as Sprite;
    const timeline = gsap.timeline();
    this.activeTimelines.add(timeline);

    try {
      const screw = (screwEntity.c as unknown as ScrewComponentAccess).screw;
      await this.swapToLongScrew(sprite, screw.color);

      const startPos = { x: screwEntity2D.position.x, y: screwEntity2D.position.y };
      const targetPos = getTraySlotPosition(targetTray as Entity2D, slotIndex, isBuffer);
      const endScale = isBuffer ? BUFFER_SLOT_SCALE : TRAY_SLOT_SCALE;
      const params = this.createFlightParams(startPos, targetPos, endScale, REMOVAL_ARC_HEIGHT);

      await this.animateFlight(timeline, screwEntity2D, sprite, params, 0.45);
      await this.animateSettle(timeline, sprite, endScale);
    } finally {
      this.activeTimelines.delete(timeline);
    }

    this.completeRemoval(screwEntity, isBuffer);
  }

  /**
   * Swap screw texture to long screw variant.
   * @param sprite - The sprite to update
   * @param color - Screw color for texture lookup
   * @example
   */
  private async swapToLongScrew(sprite: Sprite, color: ScrewColor): Promise<void> {
    sprite.scale.set(POP_OUT_SCALE);
    const longTexture = await Assets.load<Texture>(LONG_SCREW_ASSET_MAP[color]);
    sprite.texture = longTexture;
  }

  /**
   * Create flight parameters for bezier animation.
   * @param start - Start position with x and y coordinates
   * @param start.x - Start X coordinate
   * @param start.y - Start Y coordinate
   * @param end - End position with x and y coordinates
   * @param end.x - End X coordinate
   * @param end.y - End Y coordinate
   * @param endScale - Target scale
   * @param arcHeight - Arc height offset
   * @returns Flight parameters
   * @example
   */
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

  /**
   * Animate flight along bezier curve with scale interpolation.
   * @param timeline - GSAP timeline
   * @param entity - The entity to animate
   * @param sprite - The sprite visual
   * @param params - Flight parameters
   * @param duration - Animation duration in seconds
   * @example
   */
  private async animateFlight(
    timeline: gsap.core.Timeline,
    entity: Entity2D,
    sprite: Sprite,
    params: FlightParams,
    duration: number
  ): Promise<void> {
    const progress = { t: 0 };
    await timeline.to(progress, {
      t: 1,
      duration,
      ease: 'power2.inOut',
      onUpdate: () => {
        const t = progress.t;
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
      },
    });
  }

  /**
   * Animate settle bounce at end of flight.
   * @param timeline - GSAP timeline
   * @param sprite - The sprite visual
   * @param scale - Target scale
   * @example
   */
  private async animateSettle(
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
   * Complete the removal and emit event.
   * @param screwEntity - The screw entity
   * @param isBuffer - Whether the target is a buffer tray
   * @example
   */
  private completeRemoval(screwEntity: Entity, isBuffer: boolean): void {
    const screw = (screwEntity.c as unknown as ScrewComponentAccess).screw;
    screw.state = isBuffer ? 'inBuffer' : 'inTray';
    screw.isAnimating = false;

    const completeEvent: ScrewRemovalCompleteEvent = { screwEntity };
    gameEvents.emit('screw:removalComplete', completeEvent);
  }

  /**
   * Handle screw transfer animation (buffer to colored tray).
   * @param event - The removal event data
   * @example
   */
  private async handleTransfer(event: ScrewTransferEvent): Promise<void> {
    const { screwEntity, targetTray, slotIndex } = event;
    const screwEntity2D = screwEntity as Entity2D;
    const visual = getGameVisual(screwEntity2D);

    if (!visual) {
      this.completeTransfer(screwEntity, targetTray, slotIndex);
      return;
    }

    const sprite = visual as Sprite;
    const timeline = gsap.timeline();
    this.activeTimelines.add(timeline);

    try {
      const startPos = {
        x: screwEntity2D.position.x,
        y: screwEntity2D.position.y,
      };
      const targetPos = getTraySlotPosition(
        targetTray as Entity2D,
        slotIndex,
        false
      );
      const params = this.createTransferFlightParams(startPos, targetPos);

      await this.animateFlight(timeline, screwEntity2D, sprite, params, 0.4);
      await this.animateSettle(timeline, sprite, TRAY_SLOT_SCALE);
    } finally {
      this.activeTimelines.delete(timeline);
    }

    this.completeTransfer(screwEntity, targetTray, slotIndex);
  }

  /**
   * Create flight parameters for transfer animation (no pop-out).
   * @param start - Start position with x and y coordinates
   * @param start.x - Start X coordinate
   * @param start.y - Start Y coordinate
   * @param end - End position with x and y coordinates
   * @param end.x - End X coordinate
   * @param end.y - End Y coordinate
   * @returns Flight parameters
   * @example
   */
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

  /**
   * Complete the transfer and emit event.
   * @param screwEntity - The screw entity
   * @param targetTray - The target tray entity
   * @param slotIndex - The slot index in the tray
   * @example
   */
  private completeTransfer(
    screwEntity: Entity,
    targetTray: Entity,
    slotIndex: number
  ): void {
    const screw = (screwEntity.c as unknown as ScrewComponentAccess).screw;
    screw.state = 'inTray';
    screw.trayEntityId = String(targetTray.UID);
    screw.slotIndex = slotIndex;
    screw.isAnimating = false;

    gameEvents.emit('screw:transferComplete', { screwEntity });
  }

  /**
   * Update is a no-op for this system.
   * @param _time - Frame time info (unused)
   * @example
   */
  update(_time: Time): void {
    // No per-frame updates needed - animations run via GSAP
  }

  /**
   * Clean up active timelines when system is destroyed.
   * @example
   */
  destroy(): void {
    for (const timeline of this.activeTimelines) {
      timeline.kill();
    }
    this.activeTimelines.clear();
  }
}
