/**
 * Oak horizontal board part definition.
 *
 * A light wooden horizontal rectangular board.
 *
 * @module
 */

import type { PartDefinition } from '@shared/types';
import { registerPart } from '../registry';

/**
 * A horizontal oak wood board.
 *
 * Has friction constraint - can move when screws are removed.
 * 4 screw mount points at corners.
 */
export const boardOakHorizontal: PartDefinition = {
  id: 'board-oak-horizontal',
  name: 'Oak Horizontal Board',
  asset: 'images/parts/board-oak-horizontal.png',
  collision: { type: 'box', width: 755, height: 317 },
  material: 'wood',
  constraint: { type: 'friction', screwThreshold: 1 },
  screwMounts: [
    { id: 'top-left', localPosition: { x: 30, y: 30 } },
    { id: 'top-right', localPosition: { x: 725, y: 30 } },
    { id: 'bottom-left', localPosition: { x: 30, y: 287 } },
    { id: 'bottom-right', localPosition: { x: 725, y: 287 } },
  ],
};

registerPart(boardOakHorizontal);
