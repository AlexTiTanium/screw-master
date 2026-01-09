import { Scene2D, createEntity, type Entity2D } from '@play-co/odie';
import { TouchInput } from '@play-co/astro';
import { Assets, Container, Sprite, type Texture } from 'pixi.js';

import { isTestMode } from '@shared/debug';
import { loadRegion, getLevelByIndex } from '@shared/levels';
import { getPart } from '@shared/parts';
import type { LevelDefinition } from '@shared/types';
import { ScrewColor } from '@shared/types';

import {
  createTrayEntity,
  createPartEntity,
  createScrewEntity,
  createBufferTrayEntity,
} from './factories';
import { GameStateEntity } from './entities';
import {
  ScrewPlacementSystem,
  ScrewInteractionSystem,
  AnimationSystem,
  AutoTransferSystem,
  WinConditionSystem,
} from './systems';
import { gameEvents } from './utils';
import type { TrayComponentAccess } from './types';

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
  private bufferTrayEntity: Entity2D | null = null;
  private gameStateEntity: Entity2D | null = null;
  private partEntities: Entity2D[] = [];
  private screwEntities: Entity2D[] = [];
  private currentLevel: LevelDefinition | null = null;
  private currentRegionPath: string | null = null;
  private currentLevelIndex = 0;

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

    // Fix z-ordering: Move View2DSystem's entity container above puzzleLayer
    // The puzzleLayer contains background elements (puzzle base)
    // Entity views should render on top of the puzzle base but below the UI
    this.fixLayerOrder();

    // Register gameplay systems
    this.registerSystems();

    // Set up game event listeners
    this.setupGameEvents();

    this.isInitialized = true;
  }

  /**
   * Registers all gameplay systems with the scene.
   * @private
   */
  private registerSystems(): void {
    // Order matters: placement system first (no dependencies)
    this.scene.addSystem(ScrewPlacementSystem);
    this.scene.addSystem(AnimationSystem);
    this.scene.addSystem(ScrewInteractionSystem);
    this.scene.addSystem(AutoTransferSystem);
    this.scene.addSystem(WinConditionSystem);
  }

  /**
   * Sets up game event listeners.
   * @private
   */
  private setupGameEvents(): void {
    gameEvents.on('game:won', () => {
      this.handleGameWon();
    });
    gameEvents.on('game:stuck', () => {
      this.handleGameStuck();
    });
  }

  /**
   * Handles the game won event.
   * @private
   */
  private handleGameWon(): void {
    // eslint-disable-next-line no-console
    console.log('Level complete! You won!');
    // TODO: Show win UI, transition to next level, etc.
  }

  /**
   * Handles the game stuck event (soft lock).
   * @private
   */
  private handleGameStuck(): void {
    // eslint-disable-next-line no-console
    console.log('No moves available. Tap restart to try again.');
    // TODO: Show stuck UI with restart prompt
  }

  /**
   * Fixes z-ordering of stage children.
   *
   * Ensures entity views (managed by View2DSystem) render above the puzzleLayer
   * but below the uiLayer.
   * @private
   */
  private fixLayerOrder(): void {
    const stage = this.scene.view2d.stage;
    const entityContainer = this.scene.view2d.innerContainer;

    // Remove and re-add in correct order:
    // 1. backgroundLayer (bottom)
    // 2. puzzleLayer (puzzle base background)
    // 3. entityContainer (parts and screws from View2DSystem)
    // 4. uiLayer (top - buttons, frames, etc.)
    stage.removeChild(this.backgroundLayer);
    stage.removeChild(this.puzzleLayer);
    stage.removeChild(entityContainer);
    stage.removeChild(this.uiLayer);

    stage.addChild(this.backgroundLayer);
    stage.addChild(this.puzzleLayer);
    stage.addChild(entityContainer);
    stage.addChild(this.uiLayer);
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
      // Short screws (used when screw is in board)
      { alias: 'short-screw-red', src: 'images/screws/short-screw-red.png' },
      { alias: 'short-screw-yellow', src: 'images/screws/short-screw-yellow.png' },
      { alias: 'short-screw-green', src: 'images/screws/short-screw-green.png' },
      { alias: 'short-screw-blue', src: 'images/screws/short-screw-blue.png' },
      // Long screws (used when screw is removed/in tray)
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
    if (this.currentRegionPath && this.currentLevel) {
      // eslint-disable-next-line no-console
      console.log('Restarting level...');
      void this.loadLevel(this.currentRegionPath, this.currentLevelIndex);
    }
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
   * Gets the currently loaded level.
   *
   * @returns The current level definition or null if no level is loaded
   * @example
   */
  public getCurrentLevel(): LevelDefinition | null {
    return this.currentLevel;
  }

  /**
   * Loads a level from a region file.
   *
   * Creates part and screw entities based on the level definition.
   * Clears any existing level entities before loading.
   *
   * @param regionPath - Path to the region JSON file
   * @param levelIndex - Index of the level within the region (0-based)
   *
   * @example
   * await gameScene.loadLevel('regions/region-test.json', 0);
   */
  public async loadLevel(regionPath: string, levelIndex: number): Promise<void> {
    this.clearLevel();

    // Store for restart
    this.currentRegionPath = regionPath;
    this.currentLevelIndex = levelIndex;

    const region = await loadRegion(regionPath);
    const level = getLevelByIndex(region, levelIndex);
    this.currentLevel = level;

    await this.loadPartAssets(level);
    await this.createLevelEntities(level);
  }

  /**
   * Creates part and screw entities for a level.
   * @param level - The level definition to create entities from
   * @private
   */
  private async createLevelEntities(level: LevelDefinition): Promise<void> {
    // Count total screws for game state
    const totalScrews = level.parts.reduce(
      (sum, part) => sum + part.screws.length,
      0
    );

    // Create game state entity
    this.gameStateEntity = createEntity(GameStateEntity, {
      gameState: {
        phase: 'playing',
        totalScrews,
        removedScrews: 0,
        winConditionType: level.win.type,
      },
    });
    this.scene.addChild(this.gameStateEntity);

    // Create buffer tray entity
    this.bufferTrayEntity = await createBufferTrayEntity({
      position: { x: LAYOUT.bufferTrayFrame.x, y: LAYOUT.bufferTrayFrame.y },
      capacity: level.bufferCapacity ?? 5,
    });
    this.scene.addChild(this.bufferTrayEntity);

    // Create part and screw entities
    for (const partInstance of level.parts) {
      const partDef = getPart(partInstance.partId);

      const partEntity = await createPartEntity({
        assetAlias: partDef.id,
        partDefinitionId: partDef.id,
        position: partInstance.position,
        layer: partInstance.layer,
      });
      this.scene.addChild(partEntity);
      this.partEntities.push(partEntity);

      // Create screw entities for this part
      for (const screw of partInstance.screws) {
        const worldPosition = {
          x: partInstance.position.x + screw.position.x,
          y: partInstance.position.y + screw.position.y,
        };

        const screwEntity = await createScrewEntity({
          color: screw.color,
          position: worldPosition,
          partEntityId: String(partEntity.UID),
        });
        this.scene.addChild(screwEntity);
        this.screwEntities.push(screwEntity);
      }
    }
  }

  /**
   * Clears all level entities (parts, screws, game state, buffer tray).
   * Also resets tray counts.
   * @private
   */
  private clearLevel(): void {
    // Remove game state entity
    if (this.gameStateEntity) {
      this.scene.removeChild(this.gameStateEntity);
      this.gameStateEntity = null;
    }

    // Remove buffer tray entity
    if (this.bufferTrayEntity) {
      this.scene.removeChild(this.bufferTrayEntity);
      this.bufferTrayEntity = null;
    }

    // Remove part entities
    for (const entity of this.partEntities) {
      this.scene.removeChild(entity);
    }

    // Remove screw entities
    for (const entity of this.screwEntities) {
      this.scene.removeChild(entity);
    }

    // Reset tray screw counts
    for (const tray of this.trayEntities.values()) {
      const trayComponent = (tray.c as unknown as TrayComponentAccess).tray;
      trayComponent.screwCount = 0;
    }

    this.partEntities = [];
    this.screwEntities = [];
    this.currentLevel = null;
  }

  /** Tracks which part asset bundles have been registered */
  private loadedPartBundles = new Set<string>();

  /**
   * Loads asset bundles for parts used in the level.
   * @param level - The level definition containing parts to load assets for
   * @private
   */
  private async loadPartAssets(level: LevelDefinition): Promise<void> {
    // Collect unique part IDs
    const partIds = new Set(level.parts.map((p) => p.partId));

    // Filter to only parts that haven't been loaded yet
    const assets: { alias: string; src: string }[] = [];
    for (const partId of partIds) {
      if (this.loadedPartBundles.has(partId)) continue;

      const partDef = getPart(partId);
      if (partDef.asset) {
        assets.push({ alias: partDef.id, src: partDef.asset });
        this.loadedPartBundles.add(partId);
      }
    }

    if (assets.length > 0) {
      // Use unique bundle name to avoid overwrite warnings
      const bundleName = `level-parts-${Date.now()}`;
      Assets.addBundle(bundleName, assets);
      await Assets.loadBundle(bundleName);
    }
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
