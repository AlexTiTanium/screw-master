import { DefineEntity, Entity2D } from '@play-co/odie';
import { TrayComponent } from '../components';

/**
 * Entity type definition for a colored tray.
 *
 * This entity combines Entity2D (providing position, scale, rotation, and view)
 * with TrayComponent (providing color, capacity, and screw count).
 *
 * @example
 * // Create using the factory function (recommended)
 * import { createTrayEntity } from '@scenes/game/factories';
 *
 * const tray = await createTrayEntity({
 *   color: ScrewColor.Red,
 *   position: { x: 48, y: 175 },
 *   capacity: 3
 * });
 * scene.addChild(tray);
 */
export const TrayEntity = DefineEntity(Entity2D, TrayComponent);
