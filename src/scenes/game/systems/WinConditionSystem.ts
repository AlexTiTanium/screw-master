import type { Time } from '@play-co/odie';
import { BaseSystem } from './BaseSystem';
import {
  ScrewComponent,
  GameStateComponent,
  TrayComponent,
} from '../components';
import { ScrewPlacementSystem } from './ScrewPlacementSystem';
import { TrayManagementSystem } from './TrayManagementSystem';
import { gameEvents, gameTick } from '../utils';
import type {
  ScrewComponentAccess,
  GameStateComponentAccess,
  TrayComponentAccess,
} from '../types';

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
    trays: { components: [TrayComponent] },
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
   * After a buffer-to-tray transfer, we need to check both win and stuck conditions
   * because the transfer may have cleared the buffer, enabling win.
   * @internal
   */
  private handleTransferComplete = (): void => {
    this.checkWinAndStuckConditions();
  };

  /**
   * Bound handler for tray:revealed event.
   * After tray transitions complete, check win condition as all trays are now resolved.
   * @internal
   */
  private handleTrayRevealed = (): void => {
    this.checkWinAndStuckConditions();
  };

  /**
   * Initialize event listeners.
   * @example
   * system.init(); // Called automatically by ECS
   */
  init(): void {
    gameEvents.on('screw:removalComplete', this.handleRemovalComplete);
    gameEvents.on('screw:transferComplete', this.handleTransferComplete);
    gameEvents.on('tray:revealed', this.handleTrayRevealed);
  }

  /**
   * Clean up event listeners.
   * @example
   * system.destroy(); // Called automatically by ECS
   */
  destroy(): void {
    gameEvents.off('screw:removalComplete', this.handleRemovalComplete);
    gameEvents.off('screw:transferComplete', this.handleTransferComplete);
    gameEvents.off('tray:revealed', this.handleTrayRevealed);
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
   * Check win and stuck conditions without incrementing removed count.
   * Used after buffer-to-tray transfers when screws move between states
   * but no new screw has been removed from the board.
   * @example
   * this.checkWinAndStuckConditions();
   */
  private checkWinAndStuckConditions(): void {
    const gameStateEntity = this.getFirstEntity('gameState');
    if (!gameStateEntity) return;

    const gameState =
      this.getComponents<GameStateComponentAccess>(gameStateEntity).gameState;

    // Skip if game is already over
    if (gameState.phase !== 'playing') return;

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
   * Check if any screws are currently animating.
   * @returns True if any screws have isAnimating=true
   * @example
   * const animating = this.anyScrewAnimating();
   */
  private anyScrewAnimating(): boolean {
    return this.getEntities('screws').some(
      (entity) =>
        this.getComponents<ScrewComponentAccess>(entity).screw.isAnimating
    );
  }

  /**
   * Check if any trays are currently animating.
   * @returns True if any trays have isAnimating=true
   * @example
   * const animating = this.anyTrayAnimating();
   */
  private anyTrayAnimating(): boolean {
    return this.getEntities('trays').some(
      (entity) =>
        this.getComponents<TrayComponentAccess>(entity).tray.isAnimating
    );
  }

  /**
   * Check if TrayManagementSystem is busy with transitions.
   * @returns True if tray transitions are in progress or queued
   * @example
   * const busy = this.trayManagementBusy();
   */
  private trayManagementBusy(): boolean {
    const trayManagement = this.scene.getSystem(TrayManagementSystem);
    return trayManagement.isBusy();
  }

  /**
   * Check if all screws have been removed from the puzzle and game is fully resolved.
   * Win condition requires:
   * - No screws in board (all clicked)
   * - No screws in buffer (all transferred)
   * - No screws animating (all landed)
   * - No trays animating (all settled)
   * - No tray transitions pending (all resolved)
   * @returns True if game is fully resolved and player has won
   * @example
   * const allRemoved = this.checkAllScrewsRemoved();
   */
  private checkAllScrewsRemoved(): boolean {
    // Check screws in board and buffer
    const inBoard = this.countInBoardScrews();
    const inBuffer = this.countInBufferScrews();

    if (inBoard > 0 || inBuffer > 0) {
      return false;
    }

    // Check if any screws are still animating
    if (this.anyScrewAnimating()) {
      gameTick.log('WIN_CHECK', '→ not yet: screws still animating');
      return false;
    }

    // Check if any trays are still animating
    if (this.anyTrayAnimating()) {
      gameTick.log('WIN_CHECK', '→ not yet: trays still animating');
      return false;
    }

    // Check if tray transitions are pending
    if (this.trayManagementBusy()) {
      gameTick.log('WIN_CHECK', '→ not yet: tray transitions pending');
      return false;
    }

    return true;
  }

  /**
   * Check if the player is stuck (no valid moves).
   * Stuck condition requires:
   * - No valid moves available (from ScrewPlacementSystem)
   * - Screws remaining in board
   * - No screws animating (all landed)
   * - No trays animating (all settled)
   * - No tray transitions pending (all resolved)
   *
   * We must wait for all animations to complete because:
   * - A tray being revealed could provide a valid target
   * - A screw in flight could free up buffer space
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

    // Don't declare stuck while animations are in progress - a valid move may appear
    if (this.anyScrewAnimating()) {
      gameTick.log('STUCK_CHECK', '→ deferred: screws still animating');
      return;
    }

    if (this.anyTrayAnimating()) {
      gameTick.log('STUCK_CHECK', '→ deferred: trays still animating');
      return;
    }

    if (this.trayManagementBusy()) {
      gameTick.log('STUCK_CHECK', '→ deferred: tray transitions pending');
      return;
    }

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
