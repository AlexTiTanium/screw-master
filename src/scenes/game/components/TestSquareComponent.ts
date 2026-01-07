import { defineComponent } from '@shared/ecs';

/**
 * Component that stores visual properties for a colored square entity.
 *
 * This component holds the data for a square's appearance. The actual
 * rendering is done separately by adding a PixiJS Graphics object to
 * the entity's view container.
 *
 * @example
 * // Create an entity with this component using createEntity
 * import { createEntity } from '@play-co/odie';
 * import { TestSquareEntity } from '@scenes/game/entities';
 *
 * const entity = createEntity(TestSquareEntity, {
 *   testSquare: { size: 50, color: 0x00ff00 }
 * });
 *
 * @example
 * // Use with the createSquareEntity factory (recommended)
 * import { createSquareEntity } from '@scenes/game/factories';
 *
 * const square = createSquareEntity({
 *   size: 100,
 *   color: 0xff0000,
 *   position: { x: 100, y: 100 }
 * });
 */
export const TestSquareComponent = defineComponent('testSquare', {
  /** Square size in pixels */
  size: 100,
  /** Fill color as hex number */
  color: 0xff0000,
});

/** Data interface for TestSquareComponent */
export interface TestSquareComponentData {
  size: number;
  color: number;
}
