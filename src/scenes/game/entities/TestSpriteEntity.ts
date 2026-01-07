import { DefineEntity, Entity2D } from '@play-co/odie';
import { TestSpriteComponent } from '../components';

/**
 * Entity type definition for a sprite.
 *
 * This entity combines Entity2D (providing position, scale, rotation, and view)
 * with TestSpriteComponent (providing asset path data).
 *
 * @example
 * // Create entity using createEntity (low-level)
 * import { createEntity } from '@play-co/odie';
 * import { TestSpriteEntity } from '@scenes/game/entities';
 * import { Assets, Sprite } from 'pixi.js';
 *
 * const texture = await Assets.load('images/player.png');
 * const entity = createEntity(TestSpriteEntity, {
 *   testSprite: { assetPath: 'images/player.png' }
 * });
 *
 * // Add visual representation
 * const sprite = new Sprite(texture);
 * entity.view.addChild(sprite);
 *
 * // Add to scene
 * scene.addChild(entity);
 *
 * @example
 * // Recommended: Use the factory function
 * import { createSpriteEntity } from '@scenes/game/factories';
 *
 * const sprite = await createSpriteEntity({
 *   assetPath: 'images/player.png',
 *   position: { x: 100, y: 100 }
 * });
 * scene.addChild(sprite);
 */
export const TestSpriteEntity = DefineEntity(Entity2D, TestSpriteComponent);
