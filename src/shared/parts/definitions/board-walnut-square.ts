/**
 * Walnut square board part definition.
 *
 * A dark brown wooden square board used in puzzles.
 *
 * @module
 */

import type { PartDefinition } from '@shared/types';
import { registerPart } from '../registry';

/**
 * A square walnut wood board.
 *
 * Has friction constraint - can move when screws are removed.
 * 4 screw mount points at corners.
 */
export const boardWalnutSquare: PartDefinition = {
  id: 'board-walnut-square',
  name: 'Walnut Square Board',
  asset: 'images/parts/board-walnut-square.png',
  collision: { type: 'box', width: 270, height: 260 },
  material: 'wood',
  constraint: { type: 'friction', screwThreshold: 1 },
  screwMounts: [
    { id: 'top-left', localPosition: { x: 30, y: 30 } },
    { id: 'top-right', localPosition: { x: 240, y: 30 } },
    { id: 'bottom-left', localPosition: { x: 30, y: 230 } },
    { id: 'bottom-right', localPosition: { x: 240, y: 230 } },
  ],
};

registerPart(boardWalnutSquare);
