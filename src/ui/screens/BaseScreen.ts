import type { Screen, Application } from '@play-co/astro';
import { Container } from 'pixi.js';

/**
 * Abstract base class for Astro screens with common lifecycle patterns.
 *
 * This class provides default implementations for all Screen interface methods
 * and exposes protected hook methods that subclasses can override. This reduces
 * boilerplate by only requiring subclasses to implement the hooks they need.
 *
 * Screen Lifecycle:
 * 1. `constructor` - Screen is instantiated
 * 2. `prepare()` → `onPrepare()` - Screen prepares before becoming visible
 * 3. `show()` → `onShow()` - Screen becomes visible
 * 4. `update()` → `onUpdate()` - Called each frame while visible
 * 5. `hide()` → `onHide()` - Screen starts hiding
 * 6. `hidden()` → `onHidden()` - Screen is fully hidden, cleanup
 *
 * Additional hooks:
 * - `onPause()` / `onResume()` - App visibility changes
 * - `onResize()` - Window resize events
 *
 * @example
 * // Simple screen with just prepare and cleanup
 * class MenuScreen extends BaseScreen {
 *   private menuUI: Container | null = null;
 *
 *   protected async onPrepare(): Promise<void> {
 *     this.menuUI = new Container();
 *     // Setup menu UI...
 *     this.view.addChild(this.menuUI);
 *   }
 *
 *   protected async onHidden(): Promise<void> {
 *     this.menuUI?.destroy();
 *     this.menuUI = null;
 *   }
 * }
 *
 * @example
 * // Screen with update loop and pause handling
 * class GameScreen extends BaseScreen {
 *   private gameScene: GameScene | null = null;
 *
 *   protected async onPrepare(): Promise<void> {
 *     this.gameScene = new GameScene({ stage: this.view });
 *     await this.gameScene.init();
 *   }
 *
 *   protected async onShow(): Promise<void> {
 *     this.gameScene?.start();
 *   }
 *
 *   protected onUpdate(dt: number): void {
 *     this.gameScene?.update(dt);
 *   }
 *
 *   protected onPause(): void {
 *     this.gameScene?.pause();
 *   }
 *
 *   protected onResume(): void {
 *     this.gameScene?.resume();
 *   }
 *
 *   protected async onHidden(): Promise<void> {
 *     this.gameScene?.destroy();
 *     this.gameScene = null;
 *   }
 * }
 *
 * @example
 * // Register and show the screen
 * import { ScreensPlugin } from '@play-co/astro';
 *
 * const screens = app.get(ScreensPlugin);
 * screens.main.add(MenuScreen, undefined, 'menu');
 * await screens.main.show('menu');
 */
export abstract class BaseScreen implements Screen {
  /**
   * The Astro application instance.
   * @readonly
   */
  public readonly app: Application;

  /**
   * The root display container for this screen.
   * Add visual elements as children of this container.
   * @readonly
   */
  public readonly view: Container;

  /**
   * Creates a new screen instance.
   *
   * @param app - The Astro Application instance
   * @param _options - Optional configuration (available for subclasses)
   */
  constructor(app: Application, _options?: Record<string, unknown>) {
    this.app = app;
    this.view = new Container();
  }

  // ============================================
  // Protected hooks for subclasses to override
  // ============================================

  /**
   * Called when the screen is preparing to become visible.
   * Override to initialize resources, create UI, load assets.
   *
   * @returns Promise or void when preparation is complete
   */
  protected onPrepare(): Promise<void> | void {
    // Override in subclass
  }

  /**
   * Called when the screen becomes visible.
   * Override to start animations, game loops, etc.
   *
   * @returns Promise or void when show is complete
   */
  protected onShow(): Promise<void> | void {
    // Override in subclass
  }

  /**
   * Called each frame while the screen is visible.
   * Override to update game logic, animations, etc.
   *
   * @param _dt - Delta time since last frame in seconds
   */
  protected onUpdate(_dt: number): void {
    // Override in subclass
  }

  /**
   * Called when the screen starts hiding.
   * Override to stop animations, pause game loops, etc.
   *
   * @returns Promise or void when hide is complete
   */
  protected onHide(): Promise<void> | void {
    // Override in subclass
  }

  /**
   * Called when the screen is fully hidden.
   * Override to cleanup resources, destroy objects.
   *
   * @returns Promise or void when cleanup is complete
   */
  protected onHidden(): Promise<void> | void {
    // Override in subclass
  }

  /**
   * Called when the app is paused (e.g., tab loses focus).
   * Override to pause game, audio, etc.
   */
  protected onPause(): void {
    // Override in subclass
  }

  /**
   * Called when the app is resumed (e.g., tab gains focus).
   * Override to resume game, audio, etc.
   */
  protected onResume(): void {
    // Override in subclass
  }

  /**
   * Called when the window is resized.
   * Override to adjust layout, reposition elements.
   *
   * @param _w - New width in pixels
   * @param _h - New height in pixels
   */
  protected onResize(_w: number, _h: number): void {
    // Override in subclass
  }

  // ============================================
  // Screen interface implementation
  // ============================================

  /** @internal */
  public async prepare(): Promise<void> {
    await this.onPrepare();
  }

  /** @internal */
  public async show(): Promise<void> {
    await this.onShow();
  }

  /** @internal */
  public update(dt: number): void {
    this.onUpdate(dt);
  }

  /** @internal */
  public async hide(): Promise<void> {
    await this.onHide();
  }

  /** @internal */
  public async hidden(): Promise<void> {
    await this.onHidden();
  }

  /** @internal */
  public pause(): void {
    this.onPause();
  }

  /** @internal */
  public resume(): void {
    this.onResume();
  }

  /** @internal */
  public resize(w: number, h: number): void {
    this.onResize(w, h);
  }
}
