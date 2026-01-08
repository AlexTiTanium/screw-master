/**
 * Sliding cover part definition.
 *
 * A panel that slides horizontally when screws are removed.
 *
 * @module
 */

import type { PartDefinition } from '@shared/types';
import { registerPart } from '../registry';

/**
 * A sliding metal cover.
 *
 * Slides along the X axis when freed. Used to hide screws underneath.
 */
export const slidingCover: PartDefinition = {
  id: 'sliding-cover',
  name: 'Sliding Cover',
  asset: 'images/parts/sliding-cover.png',
  collision: { type: 'box', width: 150, height: 80 },
  material: 'metal',
  constraint: {
    type: 'slider',
    axis: 'x',
    min: 0,
    max: 100,
  },
  screwMounts: [
    { id: 'left', localPosition: { x: 25, y: 40 } },
    { id: 'center', localPosition: { x: 75, y: 40 } },
    { id: 'right', localPosition: { x: 125, y: 40 } },
  ],
};

registerPart(slidingCover);
