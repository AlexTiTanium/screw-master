import type { Time } from '@play-co/odie';
import { BaseSystem } from './BaseSystem';
import { ScrewComponent, GameStateComponent } from '../components';
import { ScrewPlacementSystem } from './ScrewPlacementSystem';
import { gameEvents } from '../utils';
import type { ScrewComponentAccess, GameStateComponentAccess } from '../types';

/**
 * System for detecting win and stuck conditions.
 *
 * This system monitors the game state after each screw removal and
 * determines if the player has won or is stuck (soft lock).
 *
 * Win conditions:
 * - `allScrewsRemoved`: All screws have been removed from the puzzle
 *
 * Stuck condition:
 * - No valid moves available (buffer full and no matching tray space)
 *
 * Listens for:
 * - `screw:removalComplete` - Check win/stuck after removal
 * - `screw:transferComplete` - Re-check stuck condition after transfer
 *
 * Emits:
 * - `game:won` - Player has won the level
 * - `game:stuck` - Player is stuck (soft lock)
 */
export class WinConditionSystem extends BaseSystem {
  static readonly NAME = 'winCondition';
  static Queries = {
    gameState: { components: [GameStateComponent] },
    screws: { components: [ScrewComponent] },
  };

  /**
   * Bound handler for screw:removalComplete event.
   * @internal
   */
  private handleRemovalComplete = (): void => {
    this.checkConditions();
  };

  /**
   * Bound handler for screw:transferComplete event.
   * @internal
   */
  private handleTransferComplete = (): void => {
    this.checkStuckCondition();
  };

  /**
   * Initialize event listeners.
   * @example
   * system.init(); // Called automatically by ECS
   */
  init(): void {
    gameEvents.on('screw:removalComplete', this.handleRemovalComplete);
    gameEvents.on('screw:transferComplete', this.handleTransferComplete);
  }

  /**
   * Clean up event listeners.
   * @example
   * system.destroy(); // Called automatically by ECS
   */
  destroy(): void {
    gameEvents.off('screw:removalComplete', this.handleRemovalComplete);
    gameEvents.off('screw:transferComplete', this.handleTransferComplete);
  }

  /**
   * Check both win and stuck conditions.
   * @example
   * this.checkConditions();
   */
  private checkConditions(): void {
    const gameStateEntity = this.getFirstEntity('gameState');
    if (!gameStateEntity) return;

    const gameState =
      this.getComponents<GameStateComponentAccess>(gameStateEntity).gameState;

    // Skip if game is already over
    if (gameState.phase !== 'playing') return;

    // Update removed count
    gameState.removedScrews++;

    // Check win condition
    if (this.checkWinCondition(gameState.winConditionType)) {
      gameState.phase = 'won';
      gameEvents.emit('game:won');
      return;
    }

    // Check stuck condition
    this.checkStuckCondition();
  }

  /**
   * Check if the win condition is met.
   * @param winType - The type of win condition to check
   * @returns True if the win condition is met
   * @example
   * const won = this.checkWinCondition('allScrewsRemoved');
   */
  private checkWinCondition(winType: string): boolean {
    switch (winType) {
      case 'allScrewsRemoved':
        return this.checkAllScrewsRemoved();

      // Future win conditions can be added here
      // case 'partsRemoved':
      // case 'targetFreed':

      default:
        return this.checkAllScrewsRemoved();
    }
  }

  /**
   * Count how many screws are still in the board.
   * @returns Number of screws with state 'inBoard'
   * @example
   * const remaining = this.countInBoardScrews();
   */
  private countInBoardScrews(): number {
    return this.getEntities('screws').filter(
      (entity) =>
        this.getComponents<ScrewComponentAccess>(entity).screw.state ===
        'inBoard'
    ).length;
  }

  /**
   * Count how many screws are in the buffer waiting to be transferred.
   * @returns Number of screws with state 'inBuffer'
   * @example
   * const buffered = this.countInBufferScrews();
   */
  private countInBufferScrews(): number {
    return this.getEntities('screws').filter(
      (entity) =>
        this.getComponents<ScrewComponentAccess>(entity).screw.state ===
        'inBuffer'
    ).length;
  }

  /**
   * Check if all screws have been removed from the puzzle.
   * A screw is considered "removed" when it is in a tray (not in board or buffer).
   * @returns True if no screws remain in the board or buffer
   * @example
   * const allRemoved = this.checkAllScrewsRemoved();
   */
  private checkAllScrewsRemoved(): boolean {
    return this.countInBoardScrews() === 0 && this.countInBufferScrews() === 0;
  }

  /**
   * Check if the player is stuck (no valid moves).
   * @example
   * this.checkStuckCondition();
   */
  private checkStuckCondition(): void {
    const gameStateEntity = this.getFirstEntity('gameState');
    if (!gameStateEntity) return;

    const gameState =
      this.getComponents<GameStateComponentAccess>(gameStateEntity).gameState;

    // Skip if game is already over
    if (gameState.phase !== 'playing') return;

    // Get placement system to check valid moves
    const placementSystem = this.scene.getSystem(ScrewPlacementSystem);

    if (!placementSystem.hasValidMoves()) {
      // Only stuck if there are screws remaining
      if (this.countInBoardScrews() > 0) {
        gameState.phase = 'stuck';
        gameEvents.emit('game:stuck');
      }
    }
  }

  /**
   * Update is a no-op for this system.
   * @param _time - Frame time info (unused)
   * @example
   * system.update(time); // Called automatically by ECS
   */
  update(_time: Time): void {
    // No per-frame updates needed - all logic is event-driven
  }
}
