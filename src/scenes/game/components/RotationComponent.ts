import { defineComponent } from '@shared/ecs';

/**
 * Component that stores rotation behavior for an entity.
 *
 * When combined with the RotationSystem, entities with this component
 * will rotate continuously at the specified speed.
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
export const RotationComponent = defineComponent('rotation', {
  /** Rotation speed in radians per second */
  speed: 0,
});

/** Data interface for RotationComponent */
export interface RotationComponentData {
  speed: number;
}
