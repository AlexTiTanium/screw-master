/**
 * Test scene module with ECS architecture.
 *
 * This module contains the test scene for engine validation, ECS components,
 * entities, systems, and factory functions for creating game objects.
 *
 * @example
 * import { TestScene } from '@scenes/game';
 * import { createSquareEntity, createSpriteEntity } from '@scenes/game/factories';
 * import { BaseSystem } from '@scenes/game/systems';
 *
 * @module
 */

export { TestScene } from './TestScene';
export type { TestSceneOptions } from './TestScene';

// Re-export factories for convenience
export * from './factories';

// Re-export components and entities
export * from './components';
export * from './entities';

// Re-export systems
export * from './systems';
