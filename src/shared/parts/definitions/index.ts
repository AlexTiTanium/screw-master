/**
 * Part definitions barrel export.
 *
 * Importing this module registers all part definitions with the registry.
 *
 * @module
 */

// Import all part definitions to trigger registration
import './simple-plate';
import './sliding-cover';
import './board-walnut-square';
import './board-oak-horizontal';
import './board-oak-vertical';
import './board-birch-square';
import './board-mahogany-square';
import './board-pine-horizontal';

// Re-export for direct access if needed
export { simplePlate } from './simple-plate';
export { slidingCover } from './sliding-cover';
export { boardWalnutSquare } from './board-walnut-square';
export { boardOakHorizontal } from './board-oak-horizontal';
export { boardOakVertical } from './board-oak-vertical';
export { boardBirchSquare } from './board-birch-square';
export { boardMahoganySquare } from './board-mahogany-square';
export { boardPineHorizontal } from './board-pine-horizontal';
