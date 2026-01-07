import type { Container } from 'pixi.js';
import { Graphics, Text } from 'pixi.js';

/**
 * Configuration options for creating a LoadingScene.
 */
export interface LoadingSceneOptions {
  /** The PixiJS container to add loading UI to */
  stage: Container;
  /** Width of the loading area in pixels */
  width: number;
  /** Height of the loading area in pixels */
  height: number;
}

/**
 * A simple loading scene with text and progress bar.
 *
 * This scene displays a "Loading..." text and a progress bar that can be
 * updated to show loading progress. It's a pure PixiJS implementation
 * without ODIE ECS (no entities/components/systems).
 *
 * @example
 * // Create a loading scene
 * import { LoadingScene } from '@scenes/loading';
 * import { Container } from 'pixi.js';
 *
 * const stage = new Container();
 * const loadingScene = new LoadingScene({
 *   stage,
 *   width: 1024,
 *   height: 768
 * });
 *
 * // Update progress
 * loadingScene.setProgress(0.5); // 50%
 *
 * // Clean up when done
 * loadingScene.destroy();
 *
 * @example
 * // Use with asset loading
 * import { Assets } from 'pixi.js';
 *
 * const assets = ['player.png', 'enemy.png', 'bg.png'];
 * let loaded = 0;
 *
 * for (const asset of assets) {
 *   await Assets.load(`images/${asset}`);
 *   loaded++;
 *   loadingScene.setProgress(loaded / assets.length);
 * }
 *
 * loadingScene.destroy();
 */
export class LoadingScene {
  private readonly container: Container;
  private readonly loadingText: Text;
  private readonly progressBar: Graphics;
  private readonly progressBg: Graphics;
  private progress = 0;

  /**
   * Creates a new LoadingScene instance.
   *
   * @param options - Configuration options
   */
  constructor(options: LoadingSceneOptions) {
    this.container = options.stage;

    // Create loading text
    this.loadingText = new Text({
      text: 'Loading...',
      style: {
        fontFamily: 'Arial',
        fontSize: 32,
        fill: 0xffffff,
      },
    });
    this.loadingText.anchor.set(0.5);
    this.loadingText.position.set(options.width / 2, options.height / 2 - 50);

    // Create progress bar background
    this.progressBg = new Graphics();
    this.progressBg.rect(-150, -10, 300, 20);
    this.progressBg.fill({ color: 0x333333 });
    this.progressBg.position.set(options.width / 2, options.height / 2 + 20);

    // Create progress bar
    this.progressBar = new Graphics();
    this.progressBar.position.set(
      options.width / 2 - 150,
      options.height / 2 + 10
    );

    this.container.addChild(this.loadingText);
    this.container.addChild(this.progressBg);
    this.container.addChild(this.progressBar);
  }

  /**
   * Updates the progress bar to show current loading progress.
   *
   * @param value - Progress value from 0 (empty) to 1 (full).
   *                Values outside this range are clamped.
   *
   * @example
   * loadingScene.setProgress(0);   // Empty bar
   * loadingScene.setProgress(0.5); // Half full
   * loadingScene.setProgress(1);   // Full bar
   */
  public setProgress(value: number): void {
    this.progress = Math.min(1, Math.max(0, value));
    this.updateProgressBar();
  }

  /**
   * Redraws the progress bar based on current progress.
   */
  private updateProgressBar(): void {
    this.progressBar.clear();
    this.progressBar.rect(0, 0, 300 * this.progress, 20);
    this.progressBar.fill({ color: 0x00ff00 });
  }

  /**
   * Destroys all PixiJS objects created by this scene.
   *
   * Call this when the loading scene is no longer needed to free resources.
   */
  public destroy(): void {
    this.loadingText.destroy();
    this.progressBar.destroy();
    this.progressBg.destroy();
  }
}
