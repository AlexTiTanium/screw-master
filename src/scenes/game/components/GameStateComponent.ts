import { defineComponent } from '@shared/ecs';

/**
 * Game phase types.
 */
export type GamePhase = 'playing' | 'won' | 'stuck';

/**
 * Component for tracking overall game state.
 *
 * This is a singleton component attached to a single entity that
 * tracks the game's progress through the current level.
 *
 * @example
 * const entity = createEntity(GameStateEntity, {
 *   gameState: { totalScrews: 6, winConditionType: 'allScrewsRemoved' }
 * });
 */
export const GameStateComponent = defineComponent('gameState', {
  /** Current game phase */
  phase: 'playing' as GamePhase,
  /** Total screws in the level (set at load) */
  totalScrews: 0,
  /** Number of screws removed from puzzle */
  removedScrews: 0,
  /** Type of win condition for this level */
  winConditionType: 'allScrewsRemoved' as string,
});

/** Data interface for GameStateComponent */
export interface GameStateComponentData {
  phase: GamePhase;
  totalScrews: number;
  removedScrews: number;
  winConditionType: string;
}
