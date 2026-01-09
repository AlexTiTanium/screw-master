/**
 * Mahogany square board part definition.
 *
 * A reddish-brown wooden square board.
 *
 * @module
 */

import type { PartDefinition } from '@shared/types';
import { registerPart } from '../registry';

/**
 * A square mahogany wood board.
 *
 * Has friction constraint - can move when screws are removed.
 * 4 screw mount points at corners.
 */
export const boardMahoganySquare: PartDefinition = {
  id: 'board-mahogany-square',
  name: 'Mahogany Square Board',
  asset: 'images/parts/board-mahogany-square.png',
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

registerPart(boardMahoganySquare);
