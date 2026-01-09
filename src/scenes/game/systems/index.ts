/**
 * Game systems for the ECS architecture.
 *
 * Systems contain the game logic that operates on entities with specific
 * components. They are the "S" in Entity-Component-System.
 *
 * @example
 * import { BaseSystem } from '@scenes/game/systems';
 *
 * // Create a custom system by extending BaseSystem
 * class MySystem extends BaseSystem {
 *   static readonly NAME = 'mySystem';
 *   static Queries = {
 *     targets: { components: [MyComponent] }
 *   };
 *
 *   update(time: Time): void {
 *     this.forEachEntity('targets', (entity) => {
 *       // Game logic here
 *     });
 *   }
 * }
 *
 * @module
 */

export { BaseSystem } from './BaseSystem';
export { ScrewPlacementSystem } from './ScrewPlacementSystem';
export type { PlacementTarget } from './ScrewPlacementSystem';
export { ScrewInteractionSystem } from './ScrewInteractionSystem';
export type { ScrewRemovalEvent } from './ScrewInteractionSystem';
export { AnimationSystem } from './AnimationSystem';
export type {
  ScrewRemovalCompleteEvent,
  ScrewTransferEvent,
} from './AnimationSystem';
export { AutoTransferSystem } from './AutoTransferSystem';
export { WinConditionSystem } from './WinConditionSystem';
