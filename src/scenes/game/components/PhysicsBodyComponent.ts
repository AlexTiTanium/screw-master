import { defineComponent } from '@shared/ecs';

import type { BodyType } from '@physics';

/**
 * Component for physics body association.
 *
 * Links an entity to a Planck.js physics body managed by PhysicsWorldManager.
 *
 * @example
 * const entity = createEntity(PartEntity, {
 *   physicsBody: { bodyId: 0, bodyType: 'static' }
 * });
 */
export const PhysicsBodyComponent = defineComponent('physicsBody', {
  /** Reference ID to the Planck.js body in PhysicsWorldManager */
  bodyId: -1,
  /** Current body type (static or dynamic) */
  bodyType: 'static' as BodyType,
  /** Whether the physics body is sleeping (at rest) */
  isSleeping: true,
  /** Whether physics is enabled for this body */
  enabled: true,
});

/** Data interface for PhysicsBodyComponent */
export interface PhysicsBodyComponentData {
  bodyId: number;
  bodyType: BodyType;
  isSleeping: boolean;
  enabled: boolean;
}
