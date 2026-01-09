/**
 * Scene Implementations
 *
 * ODIE scenes that provide the game logic layer. Scenes are embedded
 * inside Astro screens and contain the ECS entities and systems.
 *
 * @example
 * import { GameScene, LoadingScene } from '@scenes';
 *
 * const gameScene = new GameScene({ stage: container });
 * await gameScene.init();
 * gameScene.start();
 *
 * @module
 */

export { GameScene } from './game';
export type { GameSceneOptions } from './game';
export { LoadingScene } from './loading';
export type { LoadingSceneOptions } from './loading';
