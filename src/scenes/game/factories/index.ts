/**
 * Entity factory functions for creating game entities with their visual representations.
 *
 * These factories encapsulate the entity creation, visual setup, and positioning
 * in a single call, reducing boilerplate and centralizing entity creation logic.
 *
 * @example
 * import { createSquareEntity, createSpriteEntity } from '@scenes/game/factories';
 *
 * // Create a red square
 * const square = createSquareEntity({
 *   size: 100,
 *   color: 0xff0000,
 *   position: { x: 100, y: 100 }
 * });
 * scene.addChild(square);
 *
 * // Create a sprite
 * const sprite = await createSpriteEntity({
 *   assetPath: 'images/player.png',
 *   position: { x: 200, y: 200 }
 * });
 * scene.addChild(sprite);
 *
 * @module
 */

import { createEntity, type Entity2D } from '@play-co/odie';
import { Assets, Graphics, Sprite, type Texture } from 'pixi.js';

import { TestSquareEntity } from '../entities/TestSquareEntity';
import { TestSpriteEntity } from '../entities/TestSpriteEntity';
import { RotatingSquareEntity } from '../entities/RotatingSquareEntity';

/**
 * Position coordinates for entity placement.
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Options for creating a square entity.
 */
export interface SquareEntityOptions {
  /** Square size in pixels (width and height) */
  size: number;
  /** Fill color as hex number (e.g., 0xff0000 for red) */
  color: number;
  /** Position to place the entity */
  position: Position;
}

/**
 * Creates a colored square entity with its visual representation.
 *
 * This factory creates a TestSquareEntity with a Graphics object already
 * attached as its visual. The entity is positioned and ready to be added
 * to a scene.
 *
 * @param options - Entity configuration
 * @returns The created entity with Graphics visual attached
 *
 * @example
 * // Create a red square in the center
 * import { APP_CONFIG } from '@app';
 *
 * const redSquare = createSquareEntity({
 *   size: 100,
 *   color: 0xff0000,
 *   position: {
 *     x: APP_CONFIG.width / 2 - 50,
 *     y: APP_CONFIG.height / 2 - 50
 *   }
 * });
 * scene.addChild(redSquare);
 *
 * @example
 * // Create multiple squares with different colors
 * const colors = [0xff0000, 0x00ff00, 0x0000ff];
 * colors.forEach((color, i) => {
 *   const square = createSquareEntity({
 *     size: 50,
 *     color,
 *     position: { x: 100 + i * 60, y: 100 }
 *   });
 *   scene.addChild(square);
 * });
 *
 * @example
 * // Access the entity's component data
 * const square = createSquareEntity({ size: 100, color: 0xff0000, position: { x: 0, y: 0 } });
 * const component = square.c.testSquare;
 * console.log(component.size, component.color);
 */
export function createSquareEntity(options: SquareEntityOptions): Entity2D {
  const entity = createEntity(TestSquareEntity, {
    testSquare: {
      size: options.size,
      color: options.color,
    },
  });

  // Create the visual representation
  const graphics = new Graphics();
  graphics.rect(0, 0, options.size, options.size);
  graphics.fill({ color: options.color });

  // Add graphics to entity's view
  entity.view.addChild(graphics);

  // Set position
  entity.position.set(options.position.x, options.position.y);

  return entity;
}

/**
 * Options for creating a sprite entity.
 */
export interface SpriteEntityOptions {
  /** Path to the sprite asset (relative to assets folder) */
  assetPath: string;
  /** Position to place the entity */
  position: Position;
}

/**
 * Creates a sprite entity from an asset path.
 *
 * This factory loads the texture, creates a TestSpriteEntity with a Sprite
 * object already attached as its visual. The entity is positioned and ready
 * to be added to a scene.
 *
 * @param options - Entity configuration
 * @returns Promise resolving to the created entity with Sprite visual attached
 * @throws {Error} If the texture fails to load
 *
 * @example
 * // Create a player sprite
 * const player = await createSpriteEntity({
 *   assetPath: 'images/player.png',
 *   position: { x: 100, y: 100 }
 * });
 * scene.addChild(player);
 *
 * @example
 * // Create multiple sprites with error handling
 * const enemies = ['enemy1.png', 'enemy2.png', 'enemy3.png'];
 *
 * for (const [i, asset] of enemies.entries()) {
 *   try {
 *     const enemy = await createSpriteEntity({
 *       assetPath: `images/${asset}`,
 *       position: { x: 200 + i * 100, y: 300 }
 *     });
 *     scene.addChild(enemy);
 *   } catch (error) {
 *     console.warn(`Failed to load ${asset}:`, error);
 *   }
 * }
 *
 * @example
 * // Access the sprite for manipulation
 * const entity = await createSpriteEntity({
 *   assetPath: 'images/item.png',
 *   position: { x: 50, y: 50 }
 * });
 * const sprite = entity.view.children[0] as Sprite;
 * sprite.anchor.set(0.5); // Center the anchor
 */
export async function createSpriteEntity(
  options: SpriteEntityOptions
): Promise<Entity2D> {
  const texture = await Assets.load<Texture>(options.assetPath);

  const entity = createEntity(TestSpriteEntity, {
    testSprite: {
      assetPath: options.assetPath,
    },
  });

  // Create sprite and add to entity's view
  const sprite = new Sprite(texture);
  entity.view.addChild(sprite);

  // Set position
  entity.position.set(options.position.x, options.position.y);

  return entity;
}

/**
 * Gets the Graphics object from a square entity.
 *
 * @param entity - A square entity created with createSquareEntity
 * @returns The Graphics object or undefined if not found
 *
 * @example
 * const square = createSquareEntity({ size: 100, color: 0xff0000, position: { x: 0, y: 0 } });
 * const graphics = getSquareGraphics(square);
 * if (graphics) {
 *   graphics.tint = 0x00ff00; // Change tint to green
 * }
 */
export function getSquareGraphics(entity: Entity2D): Graphics | undefined {
  return entity.view.children[0] as Graphics | undefined;
}

/**
 * Gets the Sprite object from a sprite entity.
 *
 * @param entity - A sprite entity created with createSpriteEntity
 * @returns The Sprite object or undefined if not found
 *
 * @example
 * const entity = await createSpriteEntity({ assetPath: 'images/player.png', position: { x: 0, y: 0 } });
 * const sprite = getSpriteFromEntity(entity);
 * if (sprite) {
 *   sprite.scale.set(2); // Double the size
 * }
 */
export function getSpriteFromEntity(entity: Entity2D): Sprite | undefined {
  return entity.view.children[0] as Sprite | undefined;
}

/**
 * Options for creating a rotating square entity.
 */
export interface RotatingSquareEntityOptions {
  /** Square size in pixels (width and height) */
  size: number;
  /** Fill color as hex number (e.g., 0xff0000 for red) */
  color: number;
  /** Position to place the entity */
  position: Position;
  /** Rotation speed in radians per second */
  rotationSpeed: number;
}

/**
 * Creates a colored square entity that rotates continuously.
 *
 * This factory creates a RotatingSquareEntity with a Graphics object already
 * attached as its visual. The entity is positioned and ready to be added
 * to a scene. When RotationSystem is active, it will rotate automatically.
 *
 * @param options - Entity configuration
 * @returns The created entity with Graphics visual attached
 *
 * @example
 * // Create a green rotating square
 * const rotatingSquare = createRotatingSquareEntity({
 *   size: 80,
 *   color: 0x00ff00,
 *   position: { x: 200, y: 200 },
 *   rotationSpeed: Math.PI / 2  // 90 degrees per second
 * });
 * scene.addChild(rotatingSquare);
 */
export function createRotatingSquareEntity(
  options: RotatingSquareEntityOptions
): Entity2D {
  const entity = createEntity(RotatingSquareEntity, {
    testSquare: {
      size: options.size,
      color: options.color,
    },
    rotation: {
      speed: options.rotationSpeed,
    },
  });

  // Create the visual representation
  const graphics = new Graphics();
  // Draw centered so rotation looks correct
  const halfSize = options.size / 2;
  graphics.rect(-halfSize, -halfSize, options.size, options.size);
  graphics.fill({ color: options.color });

  // Add graphics to entity's view
  entity.view.addChild(graphics);

  // Set position
  entity.position.set(options.position.x, options.position.y);

  return entity;
}
