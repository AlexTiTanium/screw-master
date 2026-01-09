import { BaseScreen } from './BaseScreen';
import { GameScene } from '@scenes/game/GameScene';

/**
 * Game screen that hosts the main ODIE ECS game scene.
 *
 * This screen manages the lifecycle of a GameScene, bridging the Astro
 * screen system with ODIE's Scene2D. It handles:
 * - Scene initialization during `onPrepare()`
 * - Starting the scene on `onShow()`
 * - Pausing/resuming on visibility changes
 * - Cleanup on `onHidden()`
 *
 * @augments {BaseScreen}
 *
 * @example
 * // Registering the screen (typically done in bootstrap)
 * import { ScreensPlugin } from '@play-co/astro';
 * import { GameScreen } from '@ui/screens';
 *
 * const screens = app.get(ScreensPlugin);
 * screens.main.add(GameScreen, undefined, 'game');
 * await screens.main.show('game');
 *
 * @example
 * // Navigating to the game screen from another screen
 * import { getApp } from '@app';
 * import { ScreensPlugin } from '@play-co/astro';
 *
 * const app = getApp();
 * if (app) {
 *   const screens = app.get(ScreensPlugin);
 *   await screens.main.show('game');
 * }
 */
export class GameScreen extends BaseScreen {
  /**
   * The ODIE game scene instance.
   * Created during onPrepare() and destroyed during onHidden().
   */
  private gameScene: GameScene | null = null;

  /**
   * Prepares the screen before it becomes visible.
   *
   * Creates and initializes the ODIE GameScene.
   * @protected
   */
  protected override async onPrepare(): Promise<void> {
    this.gameScene = new GameScene({
      stage: this.view,
    });

    await this.gameScene.init();
  }

  /**
   * Called when the screen becomes visible.
   *
   * Starts the game scene game loop.
   * @protected
   */
  protected override onShow(): void {
    this.gameScene?.start();
  }

  /**
   * Called each frame while the screen is visible.
   *
   * @param dt - Delta time since last frame in seconds
   * @protected
   */
  protected override onUpdate(dt: number): void {
    this.gameScene?.update(dt);
  }

  /**
   * Called when the screen starts hiding.
   *
   * Pauses the game scene.
   * @protected
   */
  protected override onHide(): void {
    this.gameScene?.pause();
  }

  /**
   * Called when the screen is fully hidden.
   *
   * Destroys the game scene and cleans up resources.
   * @protected
   */
  protected override onHidden(): void {
    this.gameScene?.destroy();
    this.gameScene = null;
  }

  /**
   * Called when the app is paused (e.g., tab loses focus).
   * @protected
   */
  protected override onPause(): void {
    this.gameScene?.pause();
  }

  /**
   * Called when the app is resumed (e.g., tab gains focus).
   * @protected
   */
  protected override onResume(): void {
    this.gameScene?.resume();
  }
}
