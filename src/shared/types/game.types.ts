/**
 * Shared type definitions for game objects.
 *
 * @module
 */

/**
 * Represents a 2D position with x and y coordinates.
 *
 * @example
 * import type { Position } from '@shared/types';
 *
 * const playerPosition: Position = { x: 100, y: 200 };
 *
 * @example
 * // Use in function parameters
 * function moveEntity(entity: Entity, target: Position): void {
 *   entity.position.x = target.x;
 *   entity.position.y = target.y;
 * }
 */
export interface Position {
  /** X coordinate in pixels */
  x: number;
  /** Y coordinate in pixels */
  y: number;
}

/**
 * Represents dimensions with width and height.
 *
 * @example
 * import type { Size } from '@shared/types';
 *
 * const spriteSize: Size = { width: 64, height: 64 };
 *
 * @example
 * // Calculate area
 * function getArea(size: Size): number {
 *   return size.width * size.height;
 * }
 */
export interface Size {
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
}

/**
 * Represents the current state of the game.
 *
 * States:
 * - `'loading'` - Assets are being loaded
 * - `'playing'` - Game is actively running
 * - `'paused'` - Game is paused (player action or app background)
 * - `'gameover'` - Game has ended
 *
 * @example
 * import type { GameState } from '@shared/types';
 *
 * let currentState: GameState = 'loading';
 *
 * function startGame(): void {
 *   currentState = 'playing';
 * }
 *
 * function pauseGame(): void {
 *   if (currentState === 'playing') {
 *     currentState = 'paused';
 *   }
 * }
 *
 * @example
 * // Use in a state machine
 * function update(dt: number, state: GameState): void {
 *   switch (state) {
 *     case 'loading':
 *       updateLoadingBar();
 *       break;
 *     case 'playing':
 *       updateGameLogic(dt);
 *       break;
 *     case 'paused':
 *       // Show pause menu
 *       break;
 *     case 'gameover':
 *       showGameOverScreen();
 *       break;
 *   }
 * }
 */
export type GameState = 'loading' | 'playing' | 'paused' | 'gameover';
