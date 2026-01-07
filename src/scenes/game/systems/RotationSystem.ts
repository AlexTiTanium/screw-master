import type { Entity2D, Time } from '@play-co/odie';

import { RotationComponent } from '../components/RotationComponent';
import type { RotationComponentData } from '../components/RotationComponent';

import { BaseSystem } from './BaseSystem';

/**
 * System that rotates entities with a RotationComponent.
 *
 * This system queries all entities that have a RotationComponent and
 * updates their rotation each frame based on the component's speed
 * and the elapsed time.
 *
 * @example
 * // Add to a scene
 * import { RotationSystem } from '@scenes/game/systems';
 *
 * scene.addSystem(RotationSystem);
 *
 * @example
 * // Create an entity that will be affected by this system
 * import { createRotatingSquareEntity } from '@scenes/game/factories';
 *
 * const square = createRotatingSquareEntity({
 *   size: 100,
 *   color: 0x00ff00,
 *   position: { x: 200, y: 200 },
 *   rotationSpeed: Math.PI // 180 degrees per second
 * });
 * scene.addChild(square);
 */
export class RotationSystem extends BaseSystem {
  static readonly NAME = 'rotation';

  static Queries = {
    rotating: { components: [RotationComponent] },
  };

  /**
   * Updates all rotating entities each frame.
   *
   * @param time - Time information including deltaTime
   */
  update(time: Time): void {
    this.forEachEntity('rotating', (entity) => {
      // Entity2D's rotation property is read-only (getter proxies to view.rotation)
      // We access view.rotation directly to modify it
      const e = entity as Entity2D;
      const rotation = e.c.rotation as RotationComponentData | undefined;
      if (rotation) {
        e.view.rotation += rotation.speed * time.deltaTime;
      }
    });
  }
}
