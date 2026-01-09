import { DefineEntity, Entity2D } from '@play-co/odie';
import { ScrewComponent } from '../components';

/**
 * Entity type definition for a screw.
 *
 * This entity combines Entity2D (providing position, scale, rotation, and view)
 * with ScrewComponent (providing color, state, and part relationship data).
 *
 * @example
 * // Create using the factory function (recommended)
 * import { createScrewEntity } from '@scenes/game/factories';
 *
 * const screw = await createScrewEntity({
 *   color: ScrewColor.Blue,
 *   position: { x: 100, y: 100 }
 * });
 * scene.addChild(screw);
 */
export const ScrewEntity = DefineEntity(Entity2D, ScrewComponent);
