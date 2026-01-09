import { DefineEntity, Entity2D } from '@play-co/odie';
import { PartComponent } from '../components';

/**
 * Entity type definition for a puzzle part (board).
 *
 * This entity combines Entity2D (providing position, scale, rotation, and view)
 * with PartComponent (providing part definition reference, layer, and state).
 *
 * @example
 * // Create using the factory function (recommended)
 * import { createPartEntity } from '@scenes/game/factories';
 *
 * const board = await createPartEntity({
 *   partDefinitionId: 'board-walnut-square',
 *   position: { x: 200, y: 300 },
 *   layer: 1
 * });
 * scene.addChild(board);
 */
export const PartEntity = DefineEntity(Entity2D, PartComponent);
