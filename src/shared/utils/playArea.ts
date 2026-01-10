/**
 * Play area utilities for coordinate transformation and validation.
 *
 * The play area uses a centered coordinate system where (0, 0) is the center.
 * Parts are positioned using local coordinates which are transformed to world
 * coordinates for rendering.
 *
 * @module
 */

import type { Position } from '@shared/types';

/**
 * Play area configuration constants.
 *
 * The play area is the inner usable region inside the puzzle-base frame
 * where parts can be placed.
 */
export const PLAY_AREA = {
  /** Inner play area width in pixels */
  width: 815,

  /** Inner play area height in pixels */
  height: 860,

  /** Play area center X in world coordinates */
  centerX: 540,

  /** Play area center Y in world coordinates */
  centerY: 1199,

  /** Local coordinate bounds (centered origin at 0,0) */
  bounds: {
    /** Minimum X coordinate (left edge) */
    minX: -407,
    /** Maximum X coordinate (right edge) */
    maxX: 407,
    /** Minimum Y coordinate (top edge) */
    minY: -430,
    /** Maximum Y coordinate (bottom edge) */
    maxY: 430,
  },
} as const;

/**
 * Convert local (centered) coordinates to world coordinates.
 *
 * Local coordinates use the play area center as origin (0, 0).
 * World coordinates use the screen top-left as origin.
 *
 * @param localPosition - Position in centered coordinate system
 * @returns Position in world coordinates
 *
 * @example
 * ```typescript
 * // Center of play area
 * localToWorld({ x: 0, y: 0 }); // => { x: 540, y: 1199 }
 *
 * // Top-left corner of play area
 * localToWorld({ x: -407, y: -430 }); // => { x: 133, y: 769 }
 * ```
 */
export function localToWorld(localPosition: Position): Position {
  return {
    x: PLAY_AREA.centerX + localPosition.x,
    y: PLAY_AREA.centerY + localPosition.y,
  };
}

/**
 * Convert world coordinates to local (centered) coordinates.
 *
 * @param worldPosition - Position in world coordinates
 * @returns Position in centered coordinate system
 *
 * @example
 * ```typescript
 * worldToLocal({ x: 540, y: 1199 }); // => { x: 0, y: 0 }
 * ```
 */
export function worldToLocal(worldPosition: Position): Position {
  return {
    x: worldPosition.x - PLAY_AREA.centerX,
    y: worldPosition.y - PLAY_AREA.centerY,
  };
}

/**
 * Check if a part's bounding box fits entirely within the play area.
 *
 * The part is represented by its center position (in local coordinates)
 * and its collision box dimensions. The function checks that all four
 * edges of the part stay within the play area bounds.
 *
 * @param localPosition - Part center position in local coordinates
 * @param width - Part collision box width in pixels
 * @param height - Part collision box height in pixels
 * @returns true if the part fits entirely within the play area
 *
 * @example
 * ```typescript
 * // Small part at center - fits
 * isPartInPlayArea({ x: 0, y: 0 }, 100, 100); // => true
 *
 * // Part too close to edge - doesn't fit
 * isPartInPlayArea({ x: 350, y: 0 }, 200, 100); // => false (right edge at 450 > 407)
 * ```
 */
export function isPartInPlayArea(
  localPosition: Position,
  width: number,
  height: number
): boolean {
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  const leftEdge = localPosition.x - halfWidth;
  const rightEdge = localPosition.x + halfWidth;
  const topEdge = localPosition.y - halfHeight;
  const bottomEdge = localPosition.y + halfHeight;

  return (
    leftEdge >= PLAY_AREA.bounds.minX &&
    rightEdge <= PLAY_AREA.bounds.maxX &&
    topEdge >= PLAY_AREA.bounds.minY &&
    bottomEdge <= PLAY_AREA.bounds.maxY
  );
}

/** Detailed information about a part's position relative to play area bounds. */
export interface PartBoundsInfo {
  leftEdge: number;
  rightEdge: number;
  topEdge: number;
  bottomEdge: number;
  exceedsLeft: boolean;
  exceedsRight: boolean;
  exceedsTop: boolean;
  exceedsBottom: boolean;
}

/**
 * Get detailed information about why a part doesn't fit in the play area.
 *
 * @param localPosition - Part center position in local coordinates
 * @param width - Part collision box width in pixels
 * @param height - Part collision box height in pixels
 * @returns Object with edge positions and which bounds are exceeded
 *
 * @internal
 */
export function getPartBoundsInfo(
  localPosition: Position,
  width: number,
  height: number
): PartBoundsInfo {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const leftEdge = localPosition.x - halfWidth;
  const rightEdge = localPosition.x + halfWidth;
  const topEdge = localPosition.y - halfHeight;
  const bottomEdge = localPosition.y + halfHeight;

  return {
    leftEdge,
    rightEdge,
    topEdge,
    bottomEdge,
    exceedsLeft: leftEdge < PLAY_AREA.bounds.minX,
    exceedsRight: rightEdge > PLAY_AREA.bounds.maxX,
    exceedsTop: topEdge < PLAY_AREA.bounds.minY,
    exceedsBottom: bottomEdge > PLAY_AREA.bounds.maxY,
  };
}
