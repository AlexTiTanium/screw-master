import { BaseScreen } from './BaseScreen';
import { TestScene } from '@scenes/game/TestScene';

/**
 * Test screen that hosts the ODIE ECS test scene for engine validation.
 *
 * This screen manages the lifecycle of a TestScene, bridging the Astro
 * screen system with ODIE's Scene2D. It handles:
 * - Scene initialization during `onPrepare()`
 * - Starting the scene on `onShow()`
 * - Pausing/resuming on visibility changes
 * - Cleanup on `onHidden()`
 *
 * @extends {BaseScreen}
 *
 * @example
 * // Registering the screen (typically done in bootstrap)
 * import { ScreensPlugin } from '@play-co/astro';
 * import { TestScreen } from '@ui/screens';
 *
 * const screens = app.get(ScreensPlugin);
 * screens.main.add(TestScreen, undefined, 'test');
 * await screens.main.show('test');
 *
 * @example
 * // Navigating to the test screen from another screen
 * import { getApp } from '@app';
 * import { ScreensPlugin } from '@play-co/astro';
 *
 * const app = getApp();
 * if (app) {
 *   const screens = app.get(ScreensPlugin);
 *   await screens.main.show('test');
 * }
 */
export class TestScreen extends BaseScreen {
  /**
   * The ODIE test scene instance.
   * Created during onPrepare() and destroyed during onHidden().
   */
  private testScene: TestScene | null = null;

  /**
   * Prepares the screen before it becomes visible.
   *
   * Creates and initializes the ODIE TestScene.
   */
  protected override async onPrepare(): Promise<void> {
    this.testScene = new TestScene({
      stage: this.view,
    });

    await this.testScene.init();
  }

  /**
   * Called when the screen becomes visible.
   *
   * Starts the test scene game loop.
   */
  protected override onShow(): void {
    this.testScene?.start();
  }

  /**
   * Called each frame while the screen is visible.
   *
   * @param dt - Delta time since last frame in seconds
   */
  protected override onUpdate(dt: number): void {
    this.testScene?.update(dt);
  }

  /**
   * Called when the screen starts hiding.
   *
   * Pauses the test scene.
   */
  protected override onHide(): void {
    this.testScene?.pause();
  }

  /**
   * Called when the screen is fully hidden.
   *
   * Destroys the test scene and cleans up resources.
   */
  protected override onHidden(): void {
    this.testScene?.destroy();
    this.testScene = null;
  }

  /**
   * Called when the app is paused (e.g., tab loses focus).
   */
  protected override onPause(): void {
    this.testScene?.pause();
  }

  /**
   * Called when the app is resumed (e.g., tab gains focus).
   */
  protected override onResume(): void {
    this.testScene?.resume();
  }
}
