import { DefineEntity, Entity2D } from '@play-co/odie';
import { GameStateComponent } from '../components/GameStateComponent';

/**
 * Entity type definition for game state.
 *
 * This is a singleton entity that tracks the overall game progress.
 * It should be created once per level and holds the win condition state.
 *
 * @example
 * import { createEntity } from '@play-co/odie';
 *
 * const gameState = createEntity(GameStateEntity, {
 *   gameState: {
 *     phase: 'playing',
 *     totalScrews: 6,
 *     removedScrews: 0,
 *     winConditionType: 'allScrewsRemoved'
 *   }
 * });
 * scene.addChild(gameState);
 */
export const GameStateEntity = DefineEntity(Entity2D, GameStateComponent);
