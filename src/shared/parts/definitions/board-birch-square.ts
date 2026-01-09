/**
 * Birch square board part definition.
 *
 * A pale cream colored wooden square board.
 *
 * @module
 */

import type { PartDefinition } from '@shared/types';
import { registerPart } from '../registry';

/**
 * A square birch wood board.
 *
 * Has friction constraint - can move when screws are removed.
 * 4 screw mount points at corners.
 */
export const boardBirchSquare: PartDefinition = {
  id: 'board-birch-square',
  name: 'Birch Square Board',
  asset: 'images/parts/board-birch-square.png',
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

registerPart(boardBirchSquare);
