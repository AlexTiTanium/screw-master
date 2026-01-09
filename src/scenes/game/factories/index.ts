/**
 * Entity factory functions for creating game entities with their visual representations.
 *
 * These factories encapsulate the entity creation, visual setup, and positioning
 * in a single call, reducing boilerplate and centralizing entity creation logic.
 *
 * @example
 * import { createScrewEntity, createTrayEntity } from '@scenes/game/factories';
 * import { ScrewColor } from '@shared/types';
 *
 * // Create a screw entity
 * const screw = await createScrewEntity({
 *   color: ScrewColor.Blue,
 *   position: { x: 100, y: 100 }
 * });
 * scene.addChild(screw);
 *
 * // Create a tray entity
 * const tray = await createTrayEntity({
 *   color: ScrewColor.Red,
 *   position: { x: 48, y: 175 },
 *   capacity: 3
 * });
 * scene.addChild(tray);
 *
 * @module
 */

// Re-export game factories
export {
  createScrewEntity,
  createPartEntity,
  createTrayEntity,
  createBufferTrayEntity,
  getGameVisual,
} from './game-factories';
export type {
  ScrewEntityOptions,
  PartEntityOptions,
  TrayEntityOptions,
  BufferTrayEntityOptions,
} from './game-factories';
