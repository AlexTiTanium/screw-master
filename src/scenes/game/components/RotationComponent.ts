import type { Component } from '@play-co/odie';

/**
 * Data interface for RotationComponent initialization.
 */
export interface RotationComponentData {
  /** Rotation speed in radians per second */
  speed: number;
}

/**
 * Component that stores rotation behavior for an entity.
 *
 * When combined with the RotationSystem, entities with this component
 * will rotate continuously at the specified speed.
 *
 * @implements {Component<RotationComponentData>}
 *
 * @example
 * // Create an entity with rotation
 * import { createEntity } from '@play-co/odie';
 * import { RotatingSquareEntity } from '@scenes/game/entities';
 *
 * const entity = createEntity(RotatingSquareEntity, {
 *   testSquare: { size: 50, color: 0x00ff00 },
 *   rotation: { speed: Math.PI / 2 }  // 90 degrees per second
 * });
 */
export class RotationComponent implements Component<RotationComponentData> {
  /**
   * Component identifier used by ODIE's ECS.
   * Must match the key used in createEntity data object.
   */
  static readonly NAME = 'rotation';

  /** Rotation speed in radians per second */
  speed = 0;

  /**
   * Initializes the component with provided data.
   * Called automatically by ODIE when the entity is created.
   *
   * @param data - Initial component data
   */
  init(data: RotationComponentData): void {
    this.speed = data.speed;
  }
}
