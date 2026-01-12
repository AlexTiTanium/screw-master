import type { Entity2D } from '@play-co/odie';
import type { Position } from '@shared/types';
import { TRAY_FRAME_LAYOUT, getSlotWorldPosition } from './trayFrameLayout';
import { BUFFER_TRAY_LAYOUT } from './bufferTrayLayout';

/**
 * Display positions for the 5 colored tray slots.
 * Calculated from TRAY_FRAME_LAYOUT slot positions.
 * displayOrder 0-1 are visible, 2-4 are hidden initially.
 */
export const TRAY_DISPLAY_POSITIONS: Position[] =
  TRAY_FRAME_LAYOUT.slotOffsets.map((_, index) => getSlotWorldPosition(index));

/**
 * Y position for hidden trays (below the visible tray frame).
 */
export const TRAY_HIDDEN_Y = 450;

/**
 * X position for trays entering from under the rightmost cover.
 * This is the slot 4 position where the tray is hidden by a cover,
 * then slides left into its target slot.
 * Slot 4 X = frame.x(32) + slotOffsets[4].x(808) = 840
 */
export const TRAY_SPAWN_X =
  TRAY_FRAME_LAYOUT.framePosition.x + TRAY_FRAME_LAYOUT.slotOffsets[4].x;

/**
 * Tray sprite width for centering calculations.
 * Uses value from TRAY_FRAME_LAYOUT for consistency.
 */
const TRAY_WIDTH = TRAY_FRAME_LAYOUT.traySprite.width;

/**
 * Slot display width (matches placeholder width).
 */
const SLOT_DISPLAY_WIDTH = TRAY_FRAME_LAYOUT.placeholder.width;

/**
 * Spacing between slot centers in colored trays.
 */
const COLORED_TRAY_SLOT_SPACING = 40;

/**
 * Y offset for slots within a colored tray.
 * Centered vertically in tray height.
 */
const COLORED_TRAY_Y_OFFSET = 75;

/**
 * Calculate the world position for a screw slot in a tray.
 *
 * For colored trays, screws are centered horizontally based on capacity.
 * For buffer trays, screws go to predefined slot positions.
 *
 * @param trayEntity - The tray entity
 * @param slotIndex - The slot index (0-based)
 * @param isBuffer - Whether this is a buffer tray
 * @param trayCapacity - The tray's capacity (needed for centering calculation)
 * @returns The world position for the slot
 *
 * @example
 * const pos = getTraySlotPosition(redTray, 2, false, 3);
 * // Returns position for third slot in a 3-capacity red tray
 */
export function getTraySlotPosition(
  trayEntity: Entity2D,
  slotIndex: number,
  isBuffer: boolean,
  trayCapacity?: number
): Position {
  if (isBuffer) {
    // Buffer tray uses predefined slot positions
    const slot = BUFFER_TRAY_LAYOUT.slotPositions[slotIndex];
    if (slot) {
      return { x: slot.x, y: slot.y };
    }
    // Fallback for overflow (shouldn't happen with capacity 5)
    const fallbackSlot = BUFFER_TRAY_LAYOUT.slotPositions[0];
    return {
      x: fallbackSlot.x + slotIndex * 80,
      y: fallbackSlot.y,
    };
  }

  // Colored tray: calculate centered position based on capacity
  const capacity = trayCapacity ?? 3;
  const totalWidth =
    (capacity - 1) * COLORED_TRAY_SLOT_SPACING + SLOT_DISPLAY_WIDTH;
  const startX = (TRAY_WIDTH - totalWidth) / 2 + SLOT_DISPLAY_WIDTH / 2;

  return {
    x: trayEntity.position.x + startX + slotIndex * COLORED_TRAY_SLOT_SPACING,
    y: trayEntity.position.y + COLORED_TRAY_Y_OFFSET,
  };
}

/**
 * Calculate the target (final) position for a screw slot in a colored tray.
 *
 * Unlike getTraySlotPosition which uses the tray's current position,
 * this function uses the tray's displayOrder to calculate where the tray
 * WILL be after animations complete. Use this when you need the final
 * position even if the tray is currently animating.
 *
 * @param displayOrder - The tray's display order (0-4)
 * @param slotIndex - The slot index within the tray (0-based)
 * @param trayCapacity - The tray's capacity (needed for centering calculation)
 * @returns The target world position for the slot
 *
 * @example
 * const pos = getTraySlotTargetPosition(0, 1, 3);
 * // Returns final position for slot 1 in a 3-capacity tray at displayOrder 0
 */
export function getTraySlotTargetPosition(
  displayOrder: number,
  slotIndex: number,
  trayCapacity: number
): Position {
  // Get the fixed position for this display slot
  const trayPosition = TRAY_DISPLAY_POSITIONS[displayOrder];
  if (!trayPosition) {
    throw new Error(`Invalid displayOrder: ${String(displayOrder)}`);
  }

  // Calculate centered slot position based on capacity
  const totalWidth =
    (trayCapacity - 1) * COLORED_TRAY_SLOT_SPACING + SLOT_DISPLAY_WIDTH;
  const startX = (TRAY_WIDTH - totalWidth) / 2 + SLOT_DISPLAY_WIDTH / 2;

  return {
    x: trayPosition.x + startX + slotIndex * COLORED_TRAY_SLOT_SPACING,
    y: trayPosition.y + COLORED_TRAY_Y_OFFSET,
  };
}

/**
 * Get the next available buffer slot position.
 *
 * @param slotIndex - The slot index (0-based)
 * @returns The world position for the buffer slot
 * @example
 * const pos = getBufferSlotPosition(0); // { x: 219, y: 470 }
 */
export function getBufferSlotPosition(slotIndex: number): Position {
  const slot = BUFFER_TRAY_LAYOUT.slotPositions[slotIndex];
  if (slot) {
    return { x: slot.x, y: slot.y };
  }
  // Fallback for out-of-range index
  const fallbackSlot = BUFFER_TRAY_LAYOUT.slotPositions[0];
  return {
    x: fallbackSlot.x + slotIndex * 80,
    y: fallbackSlot.y,
  };
}
