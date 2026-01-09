/**
 * Pine horizontal board part definition.
 *
 * A light yellow wooden horizontal rectangular board.
 *
 * @module
 */

import type { PartDefinition } from '@shared/types';
import { registerPart } from '../registry';

/**
 * A horizontal pine wood board.
 *
 * Has friction constraint - can move when screws are removed.
 * 4 screw mount points at corners.
 */
export const boardPineHorizontal: PartDefinition = {
  id: 'board-pine-horizontal',
  name: 'Pine Horizontal Board',
  asset: 'images/parts/board-pine-horizontal.png',
  collision: { type: 'box', width: 501, height: 317 },
  material: 'wood',
  constraint: { type: 'friction', screwThreshold: 1 },
  screwMounts: [
    { id: 'top-left', localPosition: { x: 30, y: 30 } },
    { id: 'top-right', localPosition: { x: 471, y: 30 } },
    { id: 'bottom-left', localPosition: { x: 30, y: 287 } },
    { id: 'bottom-right', localPosition: { x: 471, y: 287 } },
  ],
};

registerPart(boardPineHorizontal);
