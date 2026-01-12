import type { Entity } from '@play-co/odie';
import { ScrewColor } from '@shared/types';

/**
 * Event data emitted when a screw removal animation completes.
 */
export interface ScrewRemovalCompleteEvent {
  /** The screw entity that was removed */
  screwEntity: Entity;
}

/**
 * Event data emitted when a screw transfer animation completes.
 */
export interface ScrewTransferCompleteEvent {
  /** The screw entity that was transferred */
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
 * Animation parameters for bezier curve flight.
 */
export interface FlightParams {
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
 * Maps screw color to long screw asset alias.
 */
export const LONG_SCREW_ASSET_MAP: Record<ScrewColor, string> = {
  [ScrewColor.Red]: 'screw-red',
  [ScrewColor.Yellow]: 'screw-yellow',
  [ScrewColor.Green]: 'screw-green',
  [ScrewColor.Blue]: 'screw-blue',
};

/**
 * Scale factor for screws in colored tray slots.
 * Long screw is 80x100, tray slot is 50x50, so ~0.5 scale fits well.
 */
export const TRAY_SLOT_SCALE = 0.5;

/**
 * Scale factor for screws in buffer tray.
 * Long screw is 80x100, Figma shows 56x70, so 0.7 scale.
 */
export const BUFFER_SLOT_SCALE = 0.7;

/** Pop-out animation height in pixels. */
export const POP_OUT_HEIGHT = 20;

/** Scale during pop-out phase. */
export const POP_OUT_SCALE = 0.8;

/** Arc height offset for bezier control point. */
export const REMOVAL_ARC_HEIGHT = 130;

/** Arc height offset for transfer bezier control point. */
export const TRANSFER_ARC_HEIGHT = 80;
