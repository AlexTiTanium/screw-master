/**
 * Game scene module with ECS architecture.
 *
 * This module contains the game scene for the screw puzzle game, ECS components,
 * entities, systems, and factory functions for creating game objects.
 *
 * @example
 * import { GameScene } from '@scenes/game';
 * import { createScrewEntity, createTrayEntity } from '@scenes/game/factories';
 * import { BaseSystem } from '@scenes/game/systems';
 *
 * @module
 */

export { GameScene } from './GameScene';
export type { GameSceneOptions } from './GameScene';

// Re-export factories for convenience
export * from './factories';

// Re-export components and entities
export * from './components';
export * from './entities';

// Re-export systems
export * from './systems';
