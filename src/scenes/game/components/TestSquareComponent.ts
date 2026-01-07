import type { Component } from '@play-co/odie';

/**
 * Data interface for TestSquareComponent initialization.
 */
export interface TestSquareComponentData {
  /** Square size in pixels (width and height) */
  size: number;
  /** Fill color as hex number (e.g., 0xff0000 for red) */
  color: number;
}

/**
 * Component that stores visual properties for a colored square entity.
 *
 * This component holds the data for a square's appearance. The actual
 * rendering is done separately by adding a PixiJS Graphics object to
 * the entity's view container.
 *
 * @implements {Component<TestSquareComponentData>}
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
 * // Access component data from an entity
 * const component = entity.c.testSquare as TestSquareComponent;
 * console.log(component.size);  // 50
 * console.log(component.color); // 0x00ff00
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
export class TestSquareComponent implements Component<TestSquareComponentData> {
  /**
   * Component identifier used by ODIE's ECS.
   * Must match the key used in createEntity data object.
   */
  static readonly NAME = 'testSquare';

  /** Square size in pixels */
  size = 100;

  /** Fill color as hex number */
  color = 0xff0000;

  /**
   * Initializes the component with provided data.
   * Called automatically by ODIE when the entity is created.
   *
   * @param data - Initial component data
   */
  init(data: TestSquareComponentData): void {
    this.size = data.size;
    this.color = data.color;
  }
}
