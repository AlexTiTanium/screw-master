import type { Entity, Entity2D, Time } from '@play-co/odie';
import { Assets, type Sprite, type Texture } from 'pixi.js';
import gsap from 'gsap';
import { BaseSystem } from './BaseSystem';
import { ScrewComponent } from '../components';
import { getGameVisual, getTrayPlaceholders } from '../factories';
import {
  getTraySlotPosition,
  gameEvents,
  TRAY_DISPLAY_POSITIONS,
  TRAY_HIDDEN_Y,
  getAnimationLayer,
  getColoredTrayLayer,
} from '../utils';
import type { ScrewRemovalEvent } from './ScrewInteractionSystem';
import type {
  TrayHideEvent,
  TrayShiftEvent,
  TrayRevealEvent,
} from './TrayManagementSystem';
import { ScrewColor } from '@shared/types';
import type { ScrewComponentAccess, TrayComponentAccess } from '../types';

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
 * Scale factor for screws in buffer tray.
 * Long screw is 80x100, Figma shows 56x70, so 0.7 scale.
 */
const BUFFER_SLOT_SCALE = 0.7;

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
 * const x = bezierPosition(0.5, 0, 100, 200); // Returns 100
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
   * system.init(); // Called automatically by ECS
   */
  init(): void {
    // Screw animation events
    gameEvents.on<ScrewRemovalEvent>('screw:startRemoval', (event) => {
      void this.handleRemoval(event);
    });
    gameEvents.on<ScrewTransferEvent>('screw:startTransfer', (event) => {
      void this.handleTransfer(event);
    });

    // Tray animation events
    gameEvents.on<TrayHideEvent>('tray:startHide', (event) => {
      void this.handleTrayHide(event);
    });
    gameEvents.on<TrayShiftEvent>('tray:startShift', (event) => {
      void this.handleTrayShift(event);
    });
    gameEvents.on<TrayRevealEvent>('tray:startReveal', (event) => {
      void this.handleTrayReveal(event);
    });
  }

  /**
   * Handle screw removal animation.
   * @param event - The removal event data
   * @example
   * // Triggered by screw:startRemoval event
   * gameEvents.emit('screw:startRemoval', { screwEntity, targetTray, slotIndex: 0, isBuffer: false });
   */
  private async handleRemoval(event: ScrewRemovalEvent): Promise<void> {
    const { screwEntity, targetTray, slotIndex, isBuffer } = event;
    const screwEntity2D = screwEntity as Entity2D;
    const visual = getGameVisual(screwEntity2D);

    if (!visual) {
      this.completeRemoval(screwEntity, isBuffer, targetTray, slotIndex);
      return;
    }

    await this.animateRemoval(screwEntity2D, visual as Sprite, event);
    this.completeRemoval(screwEntity, isBuffer, targetTray, slotIndex);
  }

  /**
   * Setup animation timeline and move entity to animation layer.
   * @param entity - The entity to animate
   * @returns GSAP timeline
   * @example
   * const timeline = this.setupAnimationTimeline(entity);
   */
  private setupAnimationTimeline(entity: Entity2D): gsap.core.Timeline {
    const timeline = gsap.timeline();
    this.activeTimelines.add(timeline);

    const animationLayer = getAnimationLayer();
    if (animationLayer) {
      animationLayer.addChild(entity.view);
    }

    return timeline;
  }

  /**
   * Perform the removal animation sequence.
   * @param entity - The screw entity
   * @param sprite - The sprite visual
   * @param event - The removal event data
   * @example
   * // Called internally by handleRemoval
   * await this.animateRemoval(entity, sprite, event);
   */
  private async animateRemoval(
    entity: Entity2D,
    sprite: Sprite,
    event: ScrewRemovalEvent
  ): Promise<void> {
    const timeline = this.setupAnimationTimeline(entity);

    try {
      await this.executeRemovalAnimation(entity, sprite, event, timeline);
    } finally {
      this.activeTimelines.delete(timeline);
    }
  }

  /**
   * Execute the removal animation phases.
   * @param entity - The screw entity
   * @param sprite - The sprite visual
   * @param event - The removal event data
   * @param timeline - GSAP timeline
   * @example
   * // Called internally by animateRemoval
   * await this.executeRemovalAnimation(entity, sprite, event, timeline);
   */
  private async executeRemovalAnimation(
    entity: Entity2D,
    sprite: Sprite,
    event: ScrewRemovalEvent,
    timeline: gsap.core.Timeline
  ): Promise<void> {
    const { targetTray, slotIndex, isBuffer } = event;
    const screw = this.getComponents<ScrewComponentAccess>(entity).screw;
    await this.swapToLongScrew(sprite, screw.color);

    const startPos = { x: entity.position.x, y: entity.position.y };
    const targetPos = this.getSlotTargetPosition(
      targetTray,
      slotIndex,
      isBuffer
    );
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

  /**
   * Get the target position for a slot in a tray.
   * @param targetTray - The target tray entity
   * @param slotIndex - The slot index
   * @param isBuffer - Whether this is a buffer tray
   * @returns The target position
   * @example
   * const pos = this.getSlotTargetPosition(tray, 0, false);
   */
  private getSlotTargetPosition(
    targetTray: Entity,
    slotIndex: number,
    isBuffer: boolean
  ): { x: number; y: number } {
    const trayCapacity = isBuffer
      ? undefined
      : this.getComponents<TrayComponentAccess>(targetTray).tray.capacity;
    return getTraySlotPosition(
      targetTray as Entity2D,
      slotIndex,
      isBuffer,
      trayCapacity
    );
  }

  /**
   * Swap screw texture to long screw variant.
   * @param sprite - The sprite to update
   * @param color - Screw color for texture lookup
   * @example
   * await this.swapToLongScrew(sprite, ScrewColor.Red);
   */
  private async swapToLongScrew(
    sprite: Sprite,
    color: ScrewColor
  ): Promise<void> {
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
   * const params = this.createFlightParams({ x: 0, y: 0 }, { x: 100, y: 100 }, 0.5, 130);
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
   * await this.animateFlight(timeline, entity, sprite, params, 0.45);
   */
  private async animateFlight(
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
   * this.updateFlightPosition(0.5, entity, sprite, params);
   */
  private updateFlightPosition(
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
   * await this.animateSettle(timeline, sprite, 0.5);
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
   * @param targetTray - The target tray entity (optional, for placeholder hiding)
   * @param slotIndex - The slot index (optional, for placeholder hiding)
   * @example
   * this.completeRemoval(screwEntity, false, tray, 0);
   */
  private completeRemoval(
    screwEntity: Entity,
    isBuffer: boolean,
    targetTray?: Entity,
    slotIndex?: number
  ): void {
    const screw = this.getComponents<ScrewComponentAccess>(screwEntity).screw;
    screw.state = isBuffer ? 'inBuffer' : 'inTray';
    screw.isAnimating = false;

    // Move screw view to appropriate layer after animation
    const screwEntity2D = screwEntity as Entity2D;
    if (!isBuffer) {
      // Colored tray: move to coloredTrayLayer
      const coloredTrayLayer = getColoredTrayLayer();
      if (coloredTrayLayer) {
        coloredTrayLayer.addChild(screwEntity2D.view);
      }
    }
    // Buffer tray: leave in animation layer (it's above uiLayer, which is fine)
    // The screw will stay visible above the buffer tray frame

    // Hide placeholder when screw lands in colored tray
    if (!isBuffer && targetTray && slotIndex !== undefined) {
      this.hidePlaceholder(targetTray as Entity2D, slotIndex);
    }

    const completeEvent: ScrewRemovalCompleteEvent = { screwEntity };
    gameEvents.emit('screw:removalComplete', completeEvent);
  }

  /**
   * Handle screw transfer animation (buffer to colored tray).
   * @param event - The removal event data
   * @example
   * // Triggered by screw:startTransfer event
   * gameEvents.emit('screw:startTransfer', { screwEntity, targetTray, slotIndex: 0 });
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
    const timeline = this.setupAnimationTimeline(screwEntity2D);

    try {
      await this.executeTransferAnimation(
        screwEntity2D,
        sprite,
        event,
        timeline
      );
    } finally {
      this.activeTimelines.delete(timeline);
    }

    this.completeTransfer(screwEntity, targetTray, slotIndex);
  }

  /**
   * Execute the transfer animation phases.
   * @param entity - The screw entity
   * @param sprite - The sprite visual
   * @param event - The transfer event data
   * @param timeline - GSAP timeline
   * @example
   * // Called internally by handleTransfer
   * await this.executeTransferAnimation(entity, sprite, event, timeline);
   */
  private async executeTransferAnimation(
    entity: Entity2D,
    sprite: Sprite,
    event: ScrewTransferEvent,
    timeline: gsap.core.Timeline
  ): Promise<void> {
    const { targetTray, slotIndex } = event;
    const startPos = { x: entity.position.x, y: entity.position.y };
    const targetPos = this.getSlotTargetPosition(targetTray, slotIndex, false);
    const params = this.createTransferFlightParams(startPos, targetPos);

    await this.animateFlight(timeline, entity, sprite, params, 0.4);
    await this.animateSettle(timeline, sprite, TRAY_SLOT_SCALE);
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
   * const params = this.createTransferFlightParams({ x: 0, y: 0 }, { x: 100, y: 100 });
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
   * this.completeTransfer(screwEntity, tray, 0);
   */
  private completeTransfer(
    screwEntity: Entity,
    targetTray: Entity,
    slotIndex: number
  ): void {
    const screw = this.getComponents<ScrewComponentAccess>(screwEntity).screw;
    screw.state = 'inTray';
    screw.trayEntityId = String(targetTray.UID);
    screw.slotIndex = slotIndex;
    screw.isAnimating = false;

    // Move screw view to coloredTrayLayer after animation
    const screwEntity2D = screwEntity as Entity2D;
    const coloredTrayLayer = getColoredTrayLayer();
    if (coloredTrayLayer) {
      coloredTrayLayer.addChild(screwEntity2D.view);
    }

    // Hide placeholder when screw lands in colored tray
    this.hidePlaceholder(targetTray as Entity2D, slotIndex);

    gameEvents.emit('screw:transferComplete', { screwEntity });
  }

  // ============================================================================
  // Tray Animations
  // ============================================================================

  /**
   * Handle tray hide animation (slide down).
   * @param event - The tray hide event data
   * @example
   * // Triggered by tray:startHide event
   * gameEvents.emit('tray:startHide', { trayEntity });
   */
  private async handleTrayHide(event: TrayHideEvent): Promise<void> {
    const { trayEntity } = event;
    const entity2D = trayEntity as Entity2D;

    const timeline = gsap.timeline();
    this.activeTimelines.add(timeline);

    try {
      await timeline.to(entity2D.position, {
        y: TRAY_HIDDEN_Y,
        duration: 0.3,
        ease: 'power2.out',
      });
    } finally {
      this.activeTimelines.delete(timeline);
    }

    gameEvents.emit('tray:hideComplete', { trayEntity });
  }

  /**
   * Handle tray shift animation (slide left to new position).
   * @param event - The tray shift event data
   * @example
   * // Triggered by tray:startShift event
   * gameEvents.emit('tray:startShift', { trayEntity, newDisplayOrder: 0 });
   */
  private async handleTrayShift(event: TrayShiftEvent): Promise<void> {
    const { trayEntity, newDisplayOrder } = event;
    const entity2D = trayEntity as Entity2D;
    const targetPos = TRAY_DISPLAY_POSITIONS[newDisplayOrder];

    if (!targetPos) {
      gameEvents.emit('tray:shiftComplete', { trayEntity });
      return;
    }

    const timeline = gsap.timeline();
    this.activeTimelines.add(timeline);

    try {
      await timeline.to(entity2D.position, {
        x: targetPos.x,
        duration: 0.3,
        ease: 'power2.inOut',
      });
    } finally {
      this.activeTimelines.delete(timeline);
    }

    gameEvents.emit('tray:shiftComplete', { trayEntity });
  }

  /**
   * Handle tray reveal animation (slide up from hidden position).
   * @param event - The tray reveal event data
   * @example
   * // Triggered by tray:startReveal event
   * gameEvents.emit('tray:startReveal', { trayEntity, displayOrder: 1 });
   */
  private async handleTrayReveal(event: TrayRevealEvent): Promise<void> {
    const { trayEntity, displayOrder } = event;
    const entity2D = trayEntity as Entity2D;
    const targetPos = TRAY_DISPLAY_POSITIONS[displayOrder];

    if (!targetPos) {
      gameEvents.emit('tray:revealComplete', { trayEntity });
      return;
    }

    // Ensure tray starts at hidden Y and target X
    entity2D.position.x = targetPos.x;
    entity2D.position.y = TRAY_HIDDEN_Y;

    const timeline = gsap.timeline();
    this.activeTimelines.add(timeline);

    try {
      await timeline.to(entity2D.position, {
        y: targetPos.y,
        duration: 0.3,
        ease: 'power2.out',
      });
    } finally {
      this.activeTimelines.delete(timeline);
    }

    gameEvents.emit('tray:revealComplete', { trayEntity });
  }

  /**
   * Hide a placeholder sprite when a screw fills that slot.
   * @param trayEntity - The tray entity
   * @param slotIndex - The slot index that was filled
   * @example
   * animationSystem.hidePlaceholder(trayEntity, 0);
   */
  public hidePlaceholder(trayEntity: Entity2D, slotIndex: number): void {
    const placeholders = getTrayPlaceholders(trayEntity);
    const placeholder = placeholders?.[slotIndex];
    if (placeholder) {
      gsap.to(placeholder, { alpha: 0, duration: 0.15, ease: 'linear' });
    }
  }

  /**
   * Update is a no-op for this system.
   * @param _time - Frame time info (unused)
   * @example
   * // Called automatically by ECS each frame
   * system.update(time);
   */
  update(_time: Time): void {
    // No per-frame updates needed - animations run via GSAP
  }

  /**
   * Clean up active timelines when system is destroyed.
   * @example
   * system.destroy(); // Called automatically by ECS
   */
  destroy(): void {
    for (const timeline of this.activeTimelines) {
      timeline.kill();
    }
    this.activeTimelines.clear();
  }
}
