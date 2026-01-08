/**
 * Simple plate part definition.
 *
 * A basic rectangular static part used for foundational puzzle elements.
 *
 * @module
 */

import type { PartDefinition } from '@shared/types';
import { registerPart } from '../registry';

/**
 * A simple rectangular metal plate.
 *
 * Static part that cannot move. Has 4 screw mount points at corners.
 */
export const simplePlate: PartDefinition = {
  id: 'simple-plate',
  name: 'Simple Plate',
  asset: 'images/parts/simple-plate.png',
  collision: { type: 'box', width: 200, height: 100 },
  material: 'metal',
  constraint: { type: 'static' },
  screwMounts: [
    { id: 'top-left', localPosition: { x: 20, y: 20 } },
    { id: 'top-right', localPosition: { x: 180, y: 20 } },
    { id: 'bottom-left', localPosition: { x: 20, y: 80 } },
    { id: 'bottom-right', localPosition: { x: 180, y: 80 } },
  ],
};

registerPart(simplePlate);
