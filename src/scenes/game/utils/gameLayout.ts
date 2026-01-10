/**
 * Layout coordinates from Figma design (1080x1920).
 * Updated from Figma node 28:14 using Layer image sizes.
 *
 * @module
 */

import {
  TRAY_FRAME_LAYOUT,
  getCoverPositionForBucket,
} from './trayFrameLayout';
import { BUFFER_TRAY_LAYOUT } from './bufferTrayLayout';

/**
 * Main game layout coordinates.
 */
export const GAME_LAYOUT = {
  // Background
  background: { x: 0, y: 0, width: 1080, height: 1920 },

  // Puzzle base (metal frame)
  puzzleBase: { x: 32, y: 676, width: 1015, height: 1090 },

  // Restart button
  restartButton: { x: 918, y: 21, width: 140, height: 140 },

  // Colored tray area (from TRAY_FRAME_LAYOUT)
  coloredTrayFrame: {
    x: TRAY_FRAME_LAYOUT.framePosition.x,
    y: TRAY_FRAME_LAYOUT.framePosition.y,
    width: TRAY_FRAME_LAYOUT.frame.width,
    height: TRAY_FRAME_LAYOUT.frame.height,
  },

  // Covers for hidden tray slots (displayOrder 2, 3, 4)
  // Positions calculated from TRAY_FRAME_LAYOUT bucket positions
  trayCovers: [
    getCoverPositionForBucket(2), // covers bucket 2
    getCoverPositionForBucket(3), // covers bucket 3
    getCoverPositionForBucket(4), // covers bucket 4
  ],

  // Buffer tray (from BUFFER_TRAY_LAYOUT)
  bufferTrayFrame: BUFFER_TRAY_LAYOUT.frame,
  bufferSlots: BUFFER_TRAY_LAYOUT.slotPositions,
} as const;
