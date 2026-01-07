import { DefineEntity, Entity2D } from '@play-co/odie';
import { TestSquareComponent } from '../components';

/**
 * Entity type definition for a colored square.
 *
 * This entity combines Entity2D (providing position, scale, rotation, and view)
 * with TestSquareComponent (providing size and color data).
 *
 * @example
 * // Create entity using createEntity (low-level)
 * import { createEntity } from '@play-co/odie';
 * import { TestSquareEntity } from '@scenes/game/entities';
 * import { Graphics } from 'pixi.js';
 *
 * const entity = createEntity(TestSquareEntity, {
 *   testSquare: { size: 100, color: 0xff0000 }
 * });
 *
 * // Add visual representation
 * const graphics = new Graphics();
 * graphics.rect(0, 0, 100, 100);
 * graphics.fill({ color: 0xff0000 });
 * entity.view.addChild(graphics);
 *
 * // Add to scene
 * scene.addChild(entity);
 *
 * @example
 * // Recommended: Use the factory function
 * import { createSquareEntity } from '@scenes/game/factories';
 *
 * const square = createSquareEntity({
 *   size: 100,
 *   color: 0xff0000,
 *   position: { x: 100, y: 100 }
 * });
 * scene.addChild(square);
 */
export const TestSquareEntity = DefineEntity(Entity2D, TestSquareComponent);
