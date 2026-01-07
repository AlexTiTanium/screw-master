import type { Screen, Application } from '@play-co/astro';
import { Container } from 'pixi.js';

import { APP_CONFIG } from '@app/config';
import { LoadingScene } from '@scenes/loading/LoadingScene';

/**
 * Loading screen that displays a progress bar during asset loading.
 *
 * This screen shows a visual loading indicator while assets are being
 * loaded. It provides a `setProgress()` method to update the progress
 * bar from 0 to 1.
 *
 * @implements {Screen}
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
export class LoadingScreen implements Screen {
  /**
   * The Astro application instance.
   * @readonly
   */
  public readonly app: Application;

  /**
   * The root display container for this screen.
   * @readonly
   */
  public readonly view: Container;

  /**
   * The loading scene with progress bar UI.
   */
  private loadingScene: LoadingScene | null = null;

  /**
   * Creates a new LoadingScreen instance.
   *
   * @param app - The Astro Application instance
   * @param _options - Optional configuration (currently unused)
   */
  constructor(app: Application, _options?: Record<string, unknown>) {
    this.app = app;
    this.view = new Container();
  }

  /**
   * Prepares the screen before it becomes visible.
   *
   * Creates the LoadingScene with progress bar UI.
   *
   * @returns A promise that resolves when preparation is complete
   */
  public async prepare(): Promise<void> {
    await Promise.resolve();
    this.loadingScene = new LoadingScene({
      stage: this.view,
      width: APP_CONFIG.width,
      height: APP_CONFIG.height,
    });
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

  /**
   * Called when the screen is fully hidden.
   *
   * Destroys the loading scene and cleans up resources.
   *
   * @returns A promise that resolves when cleanup is complete
   */
  public async hidden(): Promise<void> {
    await Promise.resolve();
    this.loadingScene?.destroy();
    this.loadingScene = null;
  }
}
