import type { Entity2D } from '@play-co/odie';
import type { Position } from '@shared/types';

/**
 * Layout coordinates for buffer tray slots.
 * These match the LAYOUT.bufferSlots from GameScene.
 */
const BUFFER_SLOTS: Position[] = [
  { x: 219, y: 470 },
  { x: 365, y: 470 },
  { x: 501, y: 470 },
  { x: 638, y: 470 },
];

/**
 * Offset for screws stacked in colored trays.
 */
const COLORED_TRAY_SLOT_SPACING = 50;

/**
 * Starting offset within a colored tray.
 */
const COLORED_TRAY_START_OFFSET = { x: 100, y: 85 };

/**
 * Calculate the world position for a screw slot in a tray.
 *
 * For colored trays, screws are stacked horizontally with spacing.
 * For buffer trays, screws go to predefined slot positions.
 *
 * @param trayEntity - The tray entity
 * @param slotIndex - The slot index (0-based)
 * @param isBuffer - Whether this is a buffer tray
 * @returns The world position for the slot
 *
 * @example
 * const pos = getTraySlotPosition(redTray, 2, false);
 * // Returns position for third slot in red tray
 */
export function getTraySlotPosition(
  trayEntity: Entity2D,
  slotIndex: number,
  isBuffer: boolean
): Position {
  if (isBuffer) {
    // Buffer tray uses predefined slot positions
    const slot = BUFFER_SLOTS[slotIndex];
    if (slot) {
      return { x: slot.x, y: slot.y };
    }
    // Fallback for overflow (shouldn't happen with capacity 5)
    const fallbackSlot = BUFFER_SLOTS[0];
    return {
      x: (fallbackSlot?.x ?? 219) + slotIndex * 80,
      y: fallbackSlot?.y ?? 470,
    };
  }

  // Colored tray: stack horizontally from tray position
  const trayPos = {
    x: trayEntity.position.x,
    y: trayEntity.position.y,
  };

  return {
    x: trayPos.x + COLORED_TRAY_START_OFFSET.x + slotIndex * COLORED_TRAY_SLOT_SPACING,
    y: trayPos.y + COLORED_TRAY_START_OFFSET.y,
  };
}

/**
 * Get the next available buffer slot position.
 *
 * @param slotIndex - The slot index (0-based)
 * @returns The world position for the buffer slot
 * @example
 */
export function getBufferSlotPosition(slotIndex: number): Position {
  const slot = BUFFER_SLOTS[slotIndex];
  if (slot) {
    return { x: slot.x, y: slot.y };
  }
  // Fallback
  const fallbackSlot = BUFFER_SLOTS[0];
  return {
    x: (fallbackSlot?.x ?? 219) + slotIndex * 80,
    y: fallbackSlot?.y ?? 470,
  };
}
