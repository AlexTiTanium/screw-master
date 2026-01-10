/**
 * Precise layout measurements for the colored tray frame.
 *
 * All values in pixels, measured from Figma design (node 34:141).
 * The frame contains 5 slot positions for trays/covers.
 *
 * Visual structure:
 * ```
 * |<-------------- 1015px frame width ------------->|
 * +------------------------------------------------+
 * | [slot0] [slot1] [slot2] [slot3] [slot4]        |
 * +------------------------------------------------+
 * ```
 *
 * Behind the frame is a dark gray background (990x190) that shows
 * through the slot openings.
 */
export const TRAY_FRAME_LAYOUT = {
  /** Frame asset dimensions (colored-tray-frame.png) */
  frame: {
    width: 1015,
    height: 210,
  },

  /** Frame position in game world */
  framePosition: {
    x: 32,
    y: 187,
  },

  /** Background layer (dark gray under slots) */
  background: {
    width: 990,
    height: 190,
    offsetX: 15, // Relative to frame top-left
    offsetY: 10,
    color: 0x535353,
  },

  /** Tray sprite dimensions */
  traySprite: {
    width: 185,
    height: 150,
  },

  /** Cover sprite dimensions */
  coverSprite: {
    width: 180,
    height: 145,
  },

  /** Screw placeholder dimensions */
  placeholder: {
    width: 40,
    height: 50,
  },

  /**
   * Slot positions relative to frame origin (0,0).
   * These are the top-left corners of each tray/cover position.
   *
   * Measured from Figma "most_common_case_2_slots_visible" frame.
   * Slot spacing is approximately 195px (tray width 185 + 10px gap).
   */
  slotOffsets: [
    { x: 25, y: 16 }, // Slot 0 (leftmost)
    { x: 220, y: 16 }, // Slot 1
    { x: 419, y: 19 }, // Slot 2
    { x: 614, y: 18 }, // Slot 3
    { x: 808, y: 18 }, // Slot 4 (rightmost)
  ],

  /** Average slot spacing (center-to-center) */
  slotSpacing: 195,
} as const;

/**
 * Calculate world position for a slot's top-left corner.
 * @param slotIndex - Index 0-4
 * @returns World position {x, y}
 * @example
 * const pos = getSlotWorldPosition(0); // { x: 57, y: 203 }
 */
export function getSlotWorldPosition(slotIndex: number): {
  x: number;
  y: number;
} {
  const offset = TRAY_FRAME_LAYOUT.slotOffsets[slotIndex];
  if (!offset) {
    throw new Error(`Invalid slot index: ${String(slotIndex)}`);
  }
  return {
    x: TRAY_FRAME_LAYOUT.framePosition.x + offset.x,
    y: TRAY_FRAME_LAYOUT.framePosition.y + offset.y,
  };
}

/**
 * Calculate position for placing a tray sprite in a slot.
 * Tray position is the same as slot position (top-left alignment).
 *
 * @param slotIndex - Index 0-4
 * @returns World position for tray top-left corner
 * @example
 * const pos = getTrayPositionForBucket(1);
 */
export function getTrayPositionForBucket(slotIndex: number): {
  x: number;
  y: number;
} {
  return getSlotWorldPosition(slotIndex);
}

/**
 * Calculate position for a cover sprite in a slot.
 * Cover position is the same as slot position (top-left alignment).
 *
 * @param slotIndex - Index 0-4
 * @returns World position for cover top-left corner
 * @example
 * const pos = getCoverPositionForBucket(2);
 */
export function getCoverPositionForBucket(slotIndex: number): {
  x: number;
  y: number;
} {
  return getSlotWorldPosition(slotIndex);
}

// Legacy export for backwards compatibility
export const getBucketWorldPosition = getSlotWorldPosition;
