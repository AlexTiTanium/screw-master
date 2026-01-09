import { DefineEntity, Entity2D } from '@play-co/odie';
import { BufferTrayComponent } from '../components';

/**
 * Entity type definition for the buffer tray.
 *
 * This entity combines Entity2D (providing position, scale, rotation, and view)
 * with BufferTrayComponent (providing capacity and screw IDs).
 *
 * @example
 * // Create using the factory function (recommended)
 * import { createBufferTrayEntity } from '@scenes/game/factories';
 *
 * const buffer = await createBufferTrayEntity({
 *   position: { x: 136, y: 405 },
 *   capacity: 5
 * });
 * scene.addChild(buffer);
 */
export const BufferTrayEntity = DefineEntity(Entity2D, BufferTrayComponent);
