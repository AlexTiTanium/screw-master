import { BaseScreen } from './BaseScreen';
import { APP_CONFIG } from '@app/config';
import { LoadingScene } from '@scenes/loading/LoadingScene';

/**
 * Loading screen that displays a progress bar during asset loading.
 *
 * This screen shows a visual loading indicator while assets are being
 * loaded. It provides a `setProgress()` method to update the progress
 * bar from 0 to 1.
 *
 * @extends {BaseScreen}
 *
 * @example
 * // Register and use with PreloadPlugin
 * import { ScreensPlugin, PreloadPlugin } from '@play-co/astro';
 * import { LoadingScreen } from '@ui/screens';
 *
 * // Register the loading screen
 * const screens = app.get(ScreensPlugin);
 * screens.main.add(LoadingScreen, undefined, 'loading');
 *
 * // Show loading screen and update progress
 * await screens.main.show('loading');
 * const loadingScreen = screens.main.current as LoadingScreen;
 *
 * // Update progress during asset loading
 * loadingScreen.setProgress(0.5); // 50%
 * loadingScreen.setProgress(1.0); // 100%
 *
 * // Hide when done
 * await screens.main.show('game');
 *
 * @example
 * // Manual progress tracking
 * import { Assets } from 'pixi.js';
 *
 * const assets = ['player.png', 'enemy.png', 'background.png'];
 * let loaded = 0;
 *
 * for (const asset of assets) {
 *   await Assets.load(`images/${asset}`);
 *   loaded++;
 *   loadingScreen.setProgress(loaded / assets.length);
 * }
 */
export class LoadingScreen extends BaseScreen {
  /**
   * The loading scene with progress bar UI.
   */
  private loadingScene: LoadingScene | null = null;

  /**
   * Prepares the screen before it becomes visible.
   *
   * Creates the LoadingScene with progress bar UI.
   */
  protected override onPrepare(): void {
    this.loadingScene = new LoadingScene({
      stage: this.view,
      width: APP_CONFIG.width,
      height: APP_CONFIG.height,
    });
  }

  /**
   * Called when the screen is fully hidden.
   *
   * Destroys the loading scene and cleans up resources.
   */
  protected override onHidden(): void {
    this.loadingScene?.destroy();
    this.loadingScene = null;
  }

  /**
   * Updates the loading progress bar.
   *
   * @param value - Progress value from 0 (empty) to 1 (full)
   *
   * @example
   * // Update to 50% progress
   * loadingScreen.setProgress(0.5);
   *
   * @example
   * // Update based on loaded count
   * const progress = loadedAssets / totalAssets;
   * loadingScreen.setProgress(progress);
   */
  public setProgress(value: number): void {
    this.loadingScene?.setProgress(value);
  }
}
