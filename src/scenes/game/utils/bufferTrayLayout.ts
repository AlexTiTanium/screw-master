/**
 * Precise layout measurements for the buffer tray.
 *
 * All values in pixels, measured from Figma design (node 36:648).
 * The buffer tray holds temporary screws before they go to colored trays.
 *
 * Visual structure:
 * ```
 * |<-------------- 780px frame width ------------->|
 * +------------------------------------------------+
 * | [slot0] [slot1] [slot2] [slot3] [slot4]        |
 * +------------------------------------------------+
 * ```
 *
 * This follows the same pattern as TRAY_FRAME_LAYOUT for consistency.
 */
export const BUFFER_TRAY_LAYOUT = {
  /** Frame position and dimensions */
  frame: {
    x: 150,
    y: 438,
    width: 780,
    height: 212,
  },

  /**
   * Buffer slot positions (center-anchored for screws).
   *
   * Calculated from Figma top-left positions with screw center offset:
   * - Screw display size: 56x70 at 0.5 scale (from 112x140 texture)
   * - Center offset: +28, +35 from top-left
   *
   * Slot spacing is approximately 140-150px between centers.
   */
  slotPositions: [
    { x: 257, y: 524 }, // slot 0: top-left(229, 489) + center offset(28, 35)
    { x: 409, y: 524 }, // slot 1: top-left(381, 489) + center offset(28, 35)
    { x: 540, y: 524 }, // slot 2: top-left(512, 489) + center offset(28, 35)
    { x: 676, y: 524 }, // slot 3: top-left(648, 489) + center offset(28, 35)
    { x: 821, y: 524 }, // slot 4: top-left(793, 489) + center offset(28, 35)
  ],

  /** Number of slots in the buffer tray */
  capacity: 5,
} as const;
