import { DefineEntity, Entity2D } from '@play-co/odie';
import { TestSquareComponent, RotationComponent } from '../components';

/**
 * Entity type definition for a colored square that rotates continuously.
 *
 * This entity combines Entity2D (providing position, scale, rotation, and view)
 * with TestSquareComponent (providing size and color data) and RotationComponent
 * (providing rotation speed). When used with RotationSystem, the entity will
 * rotate automatically each frame.
 *
 * @example
 * // Create entity using createEntity (low-level)
 * import { createEntity } from '@play-co/odie';
 * import { RotatingSquareEntity } from '@scenes/game/entities';
 * import { Graphics } from 'pixi.js';
 *
 * const entity = createEntity(RotatingSquareEntity, {
 *   testSquare: { size: 100, color: 0x00ff00 },
 *   rotation: { speed: Math.PI / 2 }  // 90 degrees per second
 * });
 *
 * // Add visual representation
 * const graphics = new Graphics();
 * graphics.rect(0, 0, 100, 100);
 * graphics.fill({ color: 0x00ff00 });
 * entity.view.addChild(graphics);
 *
 * // Add to scene
 * scene.addChild(entity);
 *
 * @example
 * // Recommended: Use the factory function
 * import { createRotatingSquareEntity } from '@scenes/game/factories';
 *
 * const square = createRotatingSquareEntity({
 *   size: 100,
 *   color: 0x00ff00,
 *   position: { x: 100, y: 100 },
 *   rotationSpeed: Math.PI / 2
 * });
 * scene.addChild(square);
 */
export const RotatingSquareEntity = DefineEntity(
  Entity2D,
  TestSquareComponent,
  RotationComponent
);
