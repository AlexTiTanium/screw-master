import type { Screen, Application } from '@play-co/astro';
import { Container } from 'pixi.js';

import { TestScene } from '@scenes/game/TestScene';

/**
 * Test screen that hosts the ODIE ECS test scene for engine validation.
 *
 * This screen manages the lifecycle of a TestScene, bridging the Astro
 * screen system with ODIE's Scene2D. It handles:
 * - Scene initialization during `prepare()`
 * - Starting the scene on `show()`
 * - Pausing/resuming on visibility changes
 * - Cleanup on `hidden()`
 *
 * @implements {Screen}
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
export class TestScreen implements Screen {
  /**
   * The Astro application instance.
   * @readonly
   */
  public readonly app: Application;

  /**
   * The root display container for this screen.
   * The TestScene uses this as its stage.
   * @readonly
   */
  public readonly view: Container;

  /**
   * The ODIE test scene instance.
   * Created during prepare() and destroyed during hidden().
   */
  private testScene: TestScene | null = null;

  /**
   * Creates a new TestScreen instance.
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
   * Creates and initializes the ODIE TestScene. This is called
   * automatically by the ScreensPlugin before the screen is shown.
   *
   * @returns A promise that resolves when preparation is complete
   */
  public async prepare(): Promise<void> {
    // Create and initialize the ODIE test scene
    this.testScene = new TestScene({
      stage: this.view,
    });

    await this.testScene.init();
  }

  /**
   * Called when the screen becomes visible.
   *
   * Starts the test scene, which begins the game loop and enables
   * entity systems.
   *
   * @returns A promise that resolves when the show transition is complete
   */
  public async show(): Promise<void> {
    await Promise.resolve();
    this.testScene?.start();
  }

  /**
   * Called each frame while the screen is visible.
   *
   * Updates the test scene with the delta time.
   *
   * @param dt - Delta time since last frame in seconds
   */
  public update(dt: number): void {
    this.testScene?.update(dt);
  }

  /**
   * Called when the screen starts hiding.
   *
   * Pauses the test scene to stop updates during transition.
   *
   * @returns A promise that resolves when the hide transition starts
   */
  public async hide(): Promise<void> {
    await Promise.resolve();
    this.testScene?.pause();
  }

  /**
   * Called when the screen is fully hidden.
   *
   * Destroys the test scene and cleans up resources.
   *
   * @returns A promise that resolves when cleanup is complete
   */
  public async hidden(): Promise<void> {
    await Promise.resolve();
    this.testScene?.destroy();
    this.testScene = null;
  }

  /**
   * Called when the app is paused (e.g., tab loses focus).
   *
   * Pauses the test scene to stop updates and save resources.
   */
  public pause(): void {
    this.testScene?.pause();
  }

  /**
   * Called when the app is resumed (e.g., tab gains focus).
   *
   * Resumes the test scene to continue updates.
   */
  public resume(): void {
    this.testScene?.resume();
  }

  /**
   * Called when the window is resized.
   *
   * Override this method to handle resize logic if needed.
   *
   * @param _w - New width in pixels
   * @param _h - New height in pixels
   */
  public resize(_w: number, _h: number): void {
    // Handle resize if needed
  }
}
