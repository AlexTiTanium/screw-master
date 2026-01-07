import type { Component } from '@play-co/odie';

/**
 * Data interface for TestSpriteComponent initialization.
 */
export interface TestSpriteComponentData {
  /** Path to the sprite asset (relative to assets folder) */
  assetPath: string;
}

/**
 * Component that stores the asset path for a sprite entity.
 *
 * This component holds the path to the sprite's texture asset. The actual
 * loading and rendering is done separately by loading the texture and
 * adding a PixiJS Sprite to the entity's view container.
 *
 * @implements {Component<TestSpriteComponentData>}
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
 * // Access component data from an entity
 * const component = entity.c.testSprite as TestSpriteComponent;
 * console.log(component.assetPath); // 'images/player.png'
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
export class TestSpriteComponent implements Component<TestSpriteComponentData> {
  /**
   * Component identifier used by ODIE's ECS.
   * Must match the key used in createEntity data object.
   */
  static readonly NAME = 'testSprite';

  /** Path to the sprite asset */
  assetPath = '';

  /**
   * Initializes the component with provided data.
   * Called automatically by ODIE when the entity is created.
   *
   * @param data - Initial component data
   */
  init(data: TestSpriteComponentData): void {
    this.assetPath = data.assetPath;
  }
}
