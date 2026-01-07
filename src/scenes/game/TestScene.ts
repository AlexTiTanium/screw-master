import { Scene2D, type Entity2D } from '@play-co/odie';
import { TouchInput } from '@play-co/astro';
import type { Container } from 'pixi.js';

import { APP_CONFIG } from '@app/config';
import { isTestMode } from '@shared/debug';

import {
  createSquareEntity,
  createSpriteEntity,
  createRotatingSquareEntity,
  getSquareGraphics,
} from './factories';
import { RotationSystem } from './systems';

/**
 * Configuration options for creating a TestScene.
 */
export interface TestSceneOptions {
  /** The PixiJS container to use as the scene's stage */
  stage: Container;
}

/**
 * Test scene using ODIE's ECS architecture for engine validation.
 *
 * TestScene wraps an ODIE Scene2D and provides methods for:
 * - Entity creation and management using factory functions
 * - Scene lifecycle (init, start, pause, resume, destroy)
 * - Integration with the test harness for E2E testing
 * - Interactive examples demonstrating TouchInput usage
 *
 * This scene is used to validate the engine integration before
 * implementing actual game logic.
 *
 * @example
 * // Create and initialize a TestScene
 * import { TestScene } from '@scenes/game';
 * import { Container } from 'pixi.js';
 *
 * const stage = new Container();
 * const testScene = new TestScene({ stage });
 *
 * await testScene.init();
 * testScene.start();
 *
 * @example
 * // Use within an Astro Screen
 * class MyTestScreen extends BaseScreen {
 *   private testScene: TestScene | null = null;
 *
 *   protected async onPrepare(): Promise<void> {
 *     this.testScene = new TestScene({ stage: this.view });
 *     await this.testScene.init();
 *   }
 *
 *   protected async onShow(): Promise<void> {
 *     this.testScene?.start();
 *   }
 * }
 */
export class TestScene {
  private scene: Scene2D;
  private isInitialized = false;
  private squareEntity: Entity2D | null = null;
  private squareInput: TouchInput | null = null;
  private isSquareGreen = false;

  /**
   * Creates a new TestScene instance.
   *
   * @param options - Configuration options including the stage container
   */
  constructor(options: TestSceneOptions) {
    this.scene = new Scene2D({
      stage: options.stage,
    });
  }

  /**
   * Initializes the game scene.
   *
   * This method:
   * 1. Registers the scene with the test harness (if in test mode)
   * 2. Creates the initial game entities
   * 3. Sets up input handling
   *
   * @returns Promise that resolves when initialization is complete
   */
  public async init(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // Register scene with test harness for ECS access
    if (isTestMode() && window.__gameTest) {
      window.__gameTest.registerScene(this.scene);
    }

    // Add systems
    this.scene.addSystem(RotationSystem);

    // Create interactive square entity (click to change color)
    this.createInteractiveSquare();

    // Create rotating square entity
    this.createRotatingSquare();

    // Load and create test sprite entity
    await this.createTestSpriteEntity();

    this.isInitialized = true;
  }

  /**
   * Creates an interactive red square that changes to green when clicked.
   *
   * This demonstrates how to use Astro's TouchInput with ODIE entities.
   * The square toggles between red and green on each click.
   */
  private createInteractiveSquare(): void {
    // Use the entity factory to create the square
    this.squareEntity = createSquareEntity({
      size: 100,
      color: 0xff0000,
      position: {
        x: APP_CONFIG.width / 2 - 50,
        y: APP_CONFIG.height / 2 - 50,
      },
    });

    // Get the graphics object for the square
    const graphics = getSquareGraphics(this.squareEntity);
    if (graphics) {
      // Make the graphics interactive for touch input
      graphics.eventMode = 'static';
      graphics.cursor = 'pointer';

      // Create TouchInput for click handling
      this.squareInput = new TouchInput(graphics);
      this.squareInput.onTap = (): Promise<void> => {
        this.toggleSquareColor();
        return Promise.resolve();
      };
    }

    // Add entity to scene
    this.scene.addChild(this.squareEntity);
  }

  /**
   * Creates a rotating square that spins continuously.
   *
   * This demonstrates how to use the RotationSystem with entities.
   */
  private createRotatingSquare(): void {
    const rotatingSquare = createRotatingSquareEntity({
      size: 80,
      color: 0x3498db, // Blue
      position: {
        x: APP_CONFIG.width / 2 + 150,
        y: APP_CONFIG.height / 2,
      },
      rotationSpeed: Math.PI / 1000, // Radians per millisecond
    });

    this.scene.addChild(rotatingSquare);
  }

  /**
   * Toggles the square color between red and green.
   *
   * This method demonstrates how to update entity visuals in response
   * to user interaction.
   */
  private toggleSquareColor(): void {
    if (!this.squareEntity) {
      return;
    }

    this.isSquareGreen = !this.isSquareGreen;
    const newColor = this.isSquareGreen ? 0x00ff00 : 0xff0000;

    // Get the graphics and redraw with new color
    const graphics = getSquareGraphics(this.squareEntity);
    if (graphics) {
      graphics.clear();
      graphics.rect(0, 0, 100, 100);
      graphics.fill({ color: newColor });
    }

    // Update component data to keep ECS in sync
    const component = this.squareEntity.c.testSquare as
      | { color: number }
      | undefined;
    if (component) {
      component.color = newColor;
    }
  }

  /**
   * Creates a test sprite entity in the top-left corner.
   */
  private async createTestSpriteEntity(): Promise<void> {
    try {
      const entity = await createSpriteEntity({
        assetPath: 'images/test-image.png',
        position: { x: 20, y: 20 },
      });

      this.scene.addChild(entity);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Failed to load test image:', error);
    }
  }

  /**
   * Starts the game scene.
   * Call this after init() to begin the game loop.
   */
  public start(): void {
    this.scene.start();
  }

  /**
   * Pauses the game scene.
   * The scene will stop updating until resume() is called.
   */
  public pause(): void {
    this.scene.paused = true;
  }

  /**
   * Resumes a paused game scene.
   */
  public resume(): void {
    this.scene.paused = false;
  }

  /**
   * Updates the game scene.
   * Called each frame by the screen's update loop.
   *
   * @param _deltaTime - Time elapsed since last frame in seconds
   */
  public update(_deltaTime: number): void {
    // Scene updates automatically via View2DSystem
  }

  /**
   * Destroys the game scene and cleans up resources.
   */
  public destroy(): void {
    // Cleanup touch input
    if (this.squareInput) {
      this.squareInput.enabled = false;
      this.squareInput = null;
    }

    this.squareEntity = null;
    this.scene.reset();
  }
}
