import type { Time } from '@play-co/odie';
import type { Container } from 'pixi.js';

import { RotationComponent } from '../components/RotationComponent';

import { BaseSystem } from './BaseSystem';

/**
 * Interface for entity with rotation capability.
 * Entity2D's rotation getter proxies to view.rotation.
 * We set rotation through the view directly.
 */
interface RotatingEntity {
  view: Container;
  c: { rotation?: RotationComponent };
}

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
      // Cast to access view - Entity2D's rotation is read-only but view.rotation is writable
      const e = entity as unknown as RotatingEntity;
      const rotationComponent = e.c.rotation;
      if (rotationComponent) {
        e.view.rotation += rotationComponent.speed * time.deltaTime;
      }
    });
  }
}
