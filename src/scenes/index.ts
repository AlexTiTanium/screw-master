/**
 * Scene Implementations
 *
 * ODIE scenes that provide the game logic layer. Scenes are embedded
 * inside Astro screens and contain the ECS entities and systems.
 *
 * @example
 * import { TestScene, LoadingScene } from '@scenes';
 *
 * const testScene = new TestScene({ stage: container });
 * await testScene.init();
 * testScene.start();
 *
 * @module
 */

export { TestScene } from './game';
export type { TestSceneOptions } from './game';
export { LoadingScene } from './loading';
export type { LoadingSceneOptions } from './loading';
