import { Scene2D, type Entity2D } from '@play-co/odie';
import { TouchInput } from '@play-co/astro';
import { Assets, Container, Sprite, type Texture } from 'pixi.js';

import { isTestMode } from '@shared/debug';
import { ScrewColor } from '@shared/types';

import { createTrayEntity } from './factories';

/**
 * Configuration options for creating a GameScene.
 */
export interface GameSceneOptions {
  /** The PixiJS container to use as the scene's stage */
  stage: Container;
}

/**
 * Layout coordinates from Figma design (1080x1920).
 * Updated from Figma node 28:14 using Layer image sizes.
 */
const LAYOUT = {
  // Background
  background: { x: 0, y: 0, width: 1080, height: 1920 },

  // Puzzle base (metal frame)
  puzzleBase: { x: 32, y: 676, width: 1015, height: 1090 },

  // Restart button
  restartButton: { x: 918, y: 21, width: 140, height: 140 },

  // Colored tray area
  coloredTrayFrame: { x: 22, y: 187, width: 1036, height: 221 },
  trays: {
    red: { x: 52, y: 202, width: 200, height: 170 },
    yellow: { x: 250, y: 202, width: 200, height: 170 },
    green: { x: 444, y: 202, width: 200, height: 170 },
    blue: { x: 639, y: 202, width: 200, height: 170 },
  },
  trayCover: { x: 843, y: 213, width: 179, height: 146 },

  // Buffer tray
  bufferTrayFrame: { x: 150, y: 438, width: 780, height: 212 },
  bufferSlots: [
    { x: 219, y: 470 }, // slot 1
    { x: 365, y: 470 }, // slot 2
    { x: 501, y: 470 }, // slot 3
    { x: 638, y: 470 }, // slot 4
  ],
} as const;

/**
 * Main game scene implementing the Figma design.
 *
 * GameScene manages the complete game UI including:
 * - Background and puzzle base
 * - Colored trays for sorted screws
 * - Buffer tray for temporary storage
 * - Restart button
 * - Puzzle area with boards and screws
 *
 * @example
 * const stage = new Container();
 * const gameScene = new GameScene({ stage });
 * await gameScene.init();
 * gameScene.start();
 */
export class GameScene {
  private scene: Scene2D;
  private isInitialized = false;

  // UI layer containers
  private backgroundLayer: Container;
  private uiLayer: Container;
  private puzzleLayer: Container;

  // UI sprites
  private restartButton: Sprite | null = null;
  private restartInput: TouchInput | null = null;

  // Entity references
  private trayEntities = new Map<ScrewColor, Entity2D>();

  constructor(options: GameSceneOptions) {
    this.scene = new Scene2D({
      stage: options.stage,
    });

    // Create layer containers
    this.backgroundLayer = new Container();
    this.uiLayer = new Container();
    this.puzzleLayer = new Container();

    // Add layers to scene stage in order
    options.stage.addChild(this.backgroundLayer);
    options.stage.addChild(this.puzzleLayer);
    options.stage.addChild(this.uiLayer);
  }

  /**
   * Initializes the game scene.
   *
   * Loads all assets and creates the UI layout.
   *
   * @example
   * await gameScene.init();
   */
  public async init(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // Register scene with test harness for ECS access
    if (isTestMode() && window.__gameTest) {
      window.__gameTest.registerScene(this.scene);
    }

    // Load assets and create UI
    await this.loadAssets();
    await this.createBackground();
    await this.createTrayArea();
    await this.createBufferTray();
    await this.createPuzzleArea();
    await this.createRestartButton();

    this.isInitialized = true;
  }

  /**
   * Registers asset bundles and loads them.
   * @private
   */
  private async loadAssets(): Promise<void> {
    // Register asset bundles matching manifest.json
    Assets.addBundle('common', [
      { alias: 'scene-background', src: 'images/backgrounds/scene-background.png' },
      { alias: 'puzzle-base', src: 'images/ui/puzzle-base.png' },
    ]);
    Assets.addBundle('ui', [
      { alias: 'restart-button', src: 'images/ui/restart-button.png' },
      { alias: 'colored-tray-frame', src: 'images/ui/colored-tray-frame.png' },
      { alias: 'buffer-tray-frame', src: 'images/ui/buffer-tray-frame.png' },
      { alias: 'tray-cover', src: 'images/ui/tray-cover.png' },
      { alias: 'tray-slot', src: 'images/ui/tray-slot.png' },
    ]);
    Assets.addBundle('trays', [
      { alias: 'tray-red', src: 'images/trays/tray-red.png' },
      { alias: 'tray-yellow', src: 'images/trays/tray-yellow.png' },
      { alias: 'tray-green', src: 'images/trays/tray-green.png' },
      { alias: 'tray-blue', src: 'images/trays/tray-blue.png' },
    ]);
    Assets.addBundle('screws', [
      { alias: 'screw-red', src: 'images/screws/screw-red.png' },
      { alias: 'screw-yellow', src: 'images/screws/screw-yellow.png' },
      { alias: 'screw-green', src: 'images/screws/screw-green.png' },
      { alias: 'screw-blue', src: 'images/screws/screw-blue.png' },
    ]);

    // Load all bundles
    await Assets.loadBundle(['common', 'ui', 'trays', 'screws']);
  }

  /**
   * Creates the background and puzzle base.
   * @private
   */
  private async createBackground(): Promise<void> {
    // Scene background
    const bgTexture = await Assets.load<Texture>('scene-background');
    const background = new Sprite(bgTexture);
    background.position.set(LAYOUT.background.x, LAYOUT.background.y);
    this.backgroundLayer.addChild(background);

    // Puzzle base (metal frame)
    const baseTexture = await Assets.load<Texture>('puzzle-base');
    const puzzleBase = new Sprite(baseTexture);
    puzzleBase.position.set(LAYOUT.puzzleBase.x, LAYOUT.puzzleBase.y);
    this.puzzleLayer.addChild(puzzleBase);
  }

  /**
   * Creates the colored tray area at the top.
   * @private
   */
  private async createTrayArea(): Promise<void> {
    // Tray frame
    const frameTexture = await Assets.load<Texture>('colored-tray-frame');
    const frame = new Sprite(frameTexture);
    frame.position.set(LAYOUT.coloredTrayFrame.x, LAYOUT.coloredTrayFrame.y);
    this.uiLayer.addChild(frame);

    // Create tray entities
    const trayConfigs: {
      color: ScrewColor;
      position: { x: number; y: number };
    }[] = [
      { color: ScrewColor.Red, position: LAYOUT.trays.red },
      { color: ScrewColor.Yellow, position: LAYOUT.trays.yellow },
      { color: ScrewColor.Green, position: LAYOUT.trays.green },
      { color: ScrewColor.Blue, position: LAYOUT.trays.blue },
    ];

    for (const config of trayConfigs) {
      const tray = await createTrayEntity({
        color: config.color,
        position: config.position,
        capacity: 3,
      });
      this.scene.addChild(tray);
      this.trayEntities.set(config.color, tray);
    }

    // Tray cover (for hidden tray slot)
    const coverTexture = await Assets.load<Texture>('tray-cover');
    const cover = new Sprite(coverTexture);
    cover.position.set(LAYOUT.trayCover.x, LAYOUT.trayCover.y);
    this.uiLayer.addChild(cover);
  }

  /**
   * Creates the buffer tray area.
   * @private
   */
  private async createBufferTray(): Promise<void> {
    const frameTexture = await Assets.load<Texture>('buffer-tray-frame');
    const frame = new Sprite(frameTexture);
    frame.position.set(LAYOUT.bufferTrayFrame.x, LAYOUT.bufferTrayFrame.y);
    this.uiLayer.addChild(frame);
  }

  /**
   * Creates the puzzle area with boards and screws.
   * This will be populated based on level data in the future.
   * @private
   */
  private async createPuzzleArea(): Promise<void> {
    // Puzzle area will be populated with parts and screws when loading a level
    // For now, just set up the container structure
  }

  /**
   * Creates the restart button.
   * @private
   */
  private async createRestartButton(): Promise<void> {
    const texture = await Assets.load<Texture>('restart-button');
    this.restartButton = new Sprite(texture);
    this.restartButton.position.set(
      LAYOUT.restartButton.x,
      LAYOUT.restartButton.y
    );

    // Make interactive
    this.restartButton.eventMode = 'static';
    this.restartButton.cursor = 'pointer';

    this.restartInput = new TouchInput(this.restartButton);
    this.restartInput.onTap = (): Promise<void> => {
      this.handleRestartClick();
      return Promise.resolve();
    };

    this.uiLayer.addChild(this.restartButton);
  }

  /**
   * Handles restart button click.
   * @private
   */
  private handleRestartClick(): void {
    // eslint-disable-next-line no-console
    console.log('Restart button clicked');
    // TODO: Implement level restart logic
  }

  /**
   * Gets a tray entity by color.
   *
   * @param color - The screw color to get the tray for
   * @returns The tray entity or undefined if not found
   *
   * @example
   * const redTray = gameScene.getTrayByColor(ScrewColor.Red);
   */
  public getTrayByColor(color: ScrewColor): Entity2D | undefined {
    return this.trayEntities.get(color);
  }

  /**
   * Starts the game scene.
   *
   * @example
   * gameScene.start();
   */
  public start(): void {
    this.scene.start();
  }

  /**
   * Pauses the game scene.
   *
   * @example
   * gameScene.pause();
   */
  public pause(): void {
    this.scene.paused = true;
  }

  /**
   * Resumes a paused game scene.
   *
   * @example
   * gameScene.resume();
   */
  public resume(): void {
    this.scene.paused = false;
  }

  /**
   * Updates the game scene.
   *
   * @param _deltaTime - Time elapsed since last frame in seconds
   *
   * @example
   * gameScene.update(0.016);
   */
  public update(_deltaTime: number): void {
    // Scene updates automatically via View2DSystem
  }

  /**
   * Destroys the game scene and cleans up resources.
   *
   * @example
   * gameScene.destroy();
   */
  public destroy(): void {
    // Cleanup touch input
    if (this.restartInput) {
      this.restartInput.enabled = false;
      this.restartInput = null;
    }

    this.restartButton = null;
    this.trayEntities.clear();

    // Clear layers
    this.backgroundLayer.removeChildren();
    this.uiLayer.removeChildren();
    this.puzzleLayer.removeChildren();

    this.scene.reset();
  }
}
