import { defineComponent } from '@shared/ecs';

/**
 * Component that stores the asset path for a sprite entity.
 *
 * This component holds the path to the sprite's texture asset. The actual
 * loading and rendering is done separately by loading the texture and
 * adding a PixiJS Sprite to the entity's view container.
 *
 * @example
 * // Create an entity with this component using createEntity
 * import { createEntity } from '@play-co/odie';
 * import { TestSpriteEntity } from '@scenes/game/entities';
 * import { Assets, Sprite } from 'pixi.js';
 *
 * const texture = await Assets.load('images/player.png');
 * const entity = createEntity(TestSpriteEntity, {
 *   testSprite: { assetPath: 'images/player.png' }
 * });
 * entity.view.addChild(new Sprite(texture));
 *
 * @example
 * // Use with the createSpriteEntity factory (recommended)
 * import { createSpriteEntity } from '@scenes/game/factories';
 *
 * const sprite = await createSpriteEntity({
 *   assetPath: 'images/player.png',
 *   position: { x: 100, y: 100 }
 * });
 */
export const TestSpriteComponent = defineComponent('testSprite', {
  /** Path to the sprite asset */
  assetPath: '',
});

/** Data interface for TestSpriteComponent */
export interface TestSpriteComponentData {
  assetPath: string;
}
