import { Scene2D, createEntity, type Entity2D } from '@play-co/odie';
import { TouchInput } from '@play-co/astro';
import { Assets, Container, Graphics, Sprite, type Texture } from 'pixi.js';

import { loadRegion, getLevelByIndex } from '@shared/levels';
import { getPart } from '@shared/parts';
import type {
  LevelDefinition,
  ScrewColor,
  PartInstance,
  PartDefinition,
  Position,
} from '@shared/types';
import { localToWorld } from '@shared/utils';

import {
  createTrayEntity,
  createPartEntity,
  createScrewEntity,
  createBufferTrayEntity,
} from './factories';
import { GameStateEntity } from './entities';
import {
  TickSystem,
  ScrewPlacementSystem,
  ScrewInteractionSystem,
  AnimationSystem,
  AutoTransferSystem,
  WinConditionSystem,
  TrayManagementSystem,
} from './systems';
import {
  gameEvents,
  gameTick,
  TRAY_DISPLAY_POSITIONS,
  TRAY_HIDDEN_Y,
  TRAY_FRAME_LAYOUT,
  GAME_LAYOUT,
  registerAnimationLayer,
  registerColoredTrayLayer,
  clearLayerRegistry,
} from './utils';

/**
 * Configuration options for creating a GameScene.
 */
export interface GameSceneOptions {
  /** The PixiJS container to use as the scene's stage */
  stage: Container;
}

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
  private coloredTrayLayer: Container; // For colored tray entities (between bg and covers)
  private animationLayer: Container; // For animated screws (on top of everything)

  // UI sprites
  private restartButton: Sprite | null = null;
  private restartInput: TouchInput | null = null;
  private trayCovers: Sprite[] = [];

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
    this.coloredTrayLayer = new Container();
    this.animationLayer = new Container();

    // Add layers to scene stage in order
    options.stage.addChild(this.backgroundLayer);
    options.stage.addChild(this.puzzleLayer);
    options.stage.addChild(this.uiLayer);
    // animationLayer added on top in fixLayerOrder() after entityContainer is available
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

    // Register scene with test harness for ECS access (even in dev mode for bug reports)
    if (window.__gameTest) {
      window.__gameTest.registerScene(this.scene);
    }

    // Load assets and create UI
    await this.loadAssets();
    await this.createBackground();
    await this.createTrayArea();
    await this.createBufferTray();
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
    // TickSystem must be first to update tick counter before other systems
    this.scene.addSystem(TickSystem);
    // Order matters: placement system first (no dependencies)
    this.scene.addSystem(ScrewPlacementSystem);
    this.scene.addSystem(AnimationSystem);
    this.scene.addSystem(ScrewInteractionSystem);
    this.scene.addSystem(AutoTransferSystem);
    this.scene.addSystem(WinConditionSystem);
    this.scene.addSystem(TrayManagementSystem);
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
   * but below the uiLayer. Animation layer is on top for animated screws.
   * @private
   */
  private fixLayerOrder(): void {
    const stage = this.scene.view2d.stage;
    const entityContainer = this.scene.view2d.innerContainer;

    // Remove and re-add in correct order:
    // 1. backgroundLayer (bottom)
    // 2. puzzleLayer (puzzle base background)
    // 3. entityContainer (parts and screws from View2DSystem)
    // 4. uiLayer (UI frames, covers, buttons)
    // 5. animationLayer (animated screws on top of everything)
    stage.removeChild(this.backgroundLayer);
    stage.removeChild(this.puzzleLayer);
    stage.removeChild(entityContainer);
    stage.removeChild(this.uiLayer);

    stage.addChild(this.backgroundLayer);
    stage.addChild(this.puzzleLayer);
    stage.addChild(entityContainer);
    stage.addChild(this.uiLayer);
    stage.addChild(this.animationLayer);

    // Register layers for AnimationSystem access
    registerAnimationLayer(this.animationLayer);
    registerColoredTrayLayer(this.coloredTrayLayer);
  }

  /**
   * Registers asset bundles and loads them.
   * @private
   */
  private async loadAssets(): Promise<void> {
    this.registerAssetBundles();
    await Assets.loadBundle([
      'common',
      'ui',
      'trays',
      'screws',
      'placeholders',
    ]);
  }

  /**
   * Registers all asset bundles.
   * @private
   */
  private registerAssetBundles(): void {
    this.registerCommonBundle();
    this.registerUIBundle();
    this.registerPlaceholderBundle();
    this.registerTrayBundle();
    this.registerScrewBundle();
  }

  private registerCommonBundle(): void {
    Assets.addBundle('common', [
      {
        alias: 'scene-background',
        src: 'images/backgrounds/scene-background.png',
      },
      { alias: 'puzzle-base', src: 'images/ui/puzzle-base.png' },
    ]);
  }

  private registerUIBundle(): void {
    Assets.addBundle('ui', [
      { alias: 'restart-button', src: 'images/ui/restart-button.png' },
      { alias: 'colored-tray-frame', src: 'images/ui/colored-tray-frame.png' },
      { alias: 'buffer-tray-frame', src: 'images/ui/buffer-tray-frame.png' },
      { alias: 'tray-cover', src: 'images/ui/tray-cover.png' },
    ]);
  }

  private registerPlaceholderBundle(): void {
    Assets.addBundle('placeholders', [
      {
        alias: 'placeholder-red',
        src: 'images/placeholders/placeholder-red.png',
      },
      {
        alias: 'placeholder-yellow',
        src: 'images/placeholders/placeholder-yellow.png',
      },
      {
        alias: 'placeholder-green',
        src: 'images/placeholders/placeholder-green.png',
      },
      {
        alias: 'placeholder-blue',
        src: 'images/placeholders/placeholder-blue.png',
      },
    ]);
  }

  private registerTrayBundle(): void {
    Assets.addBundle('trays', [
      { alias: 'tray-red', src: 'images/trays/tray-red.png' },
      { alias: 'tray-yellow', src: 'images/trays/tray-yellow.png' },
      { alias: 'tray-green', src: 'images/trays/tray-green.png' },
      { alias: 'tray-blue', src: 'images/trays/tray-blue.png' },
    ]);
  }

  private registerScrewBundle(): void {
    Assets.addBundle('screws', [
      { alias: 'short-screw-red', src: 'images/screws/short-screw-red.png' },
      {
        alias: 'short-screw-yellow',
        src: 'images/screws/short-screw-yellow.png',
      },
      {
        alias: 'short-screw-green',
        src: 'images/screws/short-screw-green.png',
      },
      { alias: 'short-screw-blue', src: 'images/screws/short-screw-blue.png' },
      { alias: 'screw-red', src: 'images/screws/screw-red.png' },
      { alias: 'screw-yellow', src: 'images/screws/screw-yellow.png' },
      { alias: 'screw-green', src: 'images/screws/screw-green.png' },
      { alias: 'screw-blue', src: 'images/screws/screw-blue.png' },
    ]);
  }

  /**
   * Creates the background and puzzle base.
   * @private
   */
  private async createBackground(): Promise<void> {
    // Scene background
    const bgTexture = await Assets.load<Texture>('scene-background');
    const background = new Sprite(bgTexture);
    background.position.set(GAME_LAYOUT.background.x, GAME_LAYOUT.background.y);
    this.backgroundLayer.addChild(background);

    // Puzzle base (metal frame)
    const baseTexture = await Assets.load<Texture>('puzzle-base');
    const puzzleBase = new Sprite(baseTexture);
    puzzleBase.position.set(GAME_LAYOUT.puzzleBase.x, GAME_LAYOUT.puzzleBase.y);
    this.puzzleLayer.addChild(puzzleBase);
  }

  /**
   * Creates the colored tray area frame and cover.
   * Tray entities are created dynamically per level in createLevelTrays().
   *
   * Z-order (bottom to top):
   * 1. Background (dark gray behind slots)
   * 2. Colored tray layer (tray entity views added here)
   * 3. Covers (behind frame, on top of colored trays)
   * 4. Frame (always on top)
   * @private
   */
  private async createTrayArea(): Promise<void> {
    // 1. Background layer (dark gray behind slot openings) - bottom
    const bg = new Graphics();
    bg.rect(
      0,
      0,
      TRAY_FRAME_LAYOUT.background.width,
      TRAY_FRAME_LAYOUT.background.height
    );
    bg.fill({ color: TRAY_FRAME_LAYOUT.background.color });
    bg.position.set(
      GAME_LAYOUT.coloredTrayFrame.x + TRAY_FRAME_LAYOUT.background.offsetX,
      GAME_LAYOUT.coloredTrayFrame.y + TRAY_FRAME_LAYOUT.background.offsetY
    );
    this.uiLayer.addChild(bg);

    // 2. Colored tray layer (tray entity views will be added here in createLevelTrays)
    this.uiLayer.addChild(this.coloredTrayLayer);

    // 3. Tray covers (for hidden tray slots) - behind frame, on top of colored trays
    const coverTexture = await Assets.load<Texture>('tray-cover');
    for (const coverPos of GAME_LAYOUT.trayCovers) {
      const cover = new Sprite(coverTexture);
      cover.position.set(coverPos.x, coverPos.y);
      this.uiLayer.addChild(cover);
      this.trayCovers.push(cover);
    }

    // 4. Tray frame (always on top)
    const frameTexture = await Assets.load<Texture>('colored-tray-frame');
    const frame = new Sprite(frameTexture);
    frame.position.set(
      GAME_LAYOUT.coloredTrayFrame.x,
      GAME_LAYOUT.coloredTrayFrame.y
    );
    this.uiLayer.addChild(frame);
  }

  /**
   * Creates tray entities based on level configuration.
   * Array order in level.trays determines displayOrder:
   * - Index 0-1: Visible trays (displayOrder 0-1)
   * - Index 2-4: Hidden trays below visible area (displayOrder 2-4)
   * Levels can have 4-5 trays.
   *
   * Tray views are added to coloredTrayLayer for proper z-ordering
   * (between background and covers).
   * @param level - The level definition containing tray configs
   * @private
   */
  private async createLevelTrays(level: LevelDefinition): Promise<void> {
    const trayConfigs = level.trays;

    for (let i = 0; i < trayConfigs.length; i++) {
      const config = trayConfigs[i];
      if (!config) continue;

      const displayOrder = i;
      const isVisible = displayOrder < 2;

      // Visible trays use display positions, hidden trays start below
      const displayPosition = TRAY_DISPLAY_POSITIONS[displayOrder];
      const position = isVisible
        ? { x: displayPosition?.x ?? 40, y: displayPosition?.y ?? 202 }
        : { x: displayPosition?.x ?? 40, y: TRAY_HIDDEN_Y };

      const tray = await createTrayEntity({
        color: config.color,
        position,
        capacity: config.capacity,
        displayOrder,
      });
      // Add entity to scene for ECS management
      this.scene.addChild(tray);
      this.trayEntities.set(config.color, tray);

      // Move tray view to coloredTrayLayer for proper z-ordering
      // (between background and covers in uiLayer)
      this.coloredTrayLayer.addChild(tray.view);
    }
  }

  /**
   * Creates the buffer tray area.
   * @private
   */
  private async createBufferTray(): Promise<void> {
    const frameTexture = await Assets.load<Texture>('buffer-tray-frame');
    const frame = new Sprite(frameTexture);
    frame.position.set(
      GAME_LAYOUT.bufferTrayFrame.x,
      GAME_LAYOUT.bufferTrayFrame.y
    );
    this.uiLayer.addChild(frame);
  }

  /**
   * Creates the restart button.
   * @private
   */
  private async createRestartButton(): Promise<void> {
    const texture = await Assets.load<Texture>('restart-button');
    this.restartButton = new Sprite(texture);
    this.restartButton.position.set(
      GAME_LAYOUT.restartButton.x,
      GAME_LAYOUT.restartButton.y
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
   * Gets the animation layer container.
   * Used by AnimationSystem to move screws to top during animation.
   *
   * @returns The animation layer container
   * @example
   * const layer = gameScene.getAnimationLayer();
   * layer.addChild(screwSprite);
   */
  public getAnimationLayer(): Container {
    return this.animationLayer;
  }

  /**
   * Gets the colored tray layer container.
   * Used by AnimationSystem to move screws to correct layer after animation.
   *
   * @returns The colored tray layer container
   * @example
   * const layer = gameScene.getColoredTrayLayer();
   * layer.addChild(screwSprite);
   */
  public getColoredTrayLayer(): Container {
    return this.coloredTrayLayer;
  }

  /**
   * Gets the currently loaded level.
   *
   * @returns The current level definition or null if no level is loaded
   * @example
   * const level = gameScene.getCurrentLevel();
   * if (level) console.log(level.parts.length);
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
  public async loadLevel(
    regionPath: string,
    levelIndex: number
  ): Promise<void> {
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
    this.createGameStateEntity(level);
    await this.createLevelTrays(level);
    await this.createBufferTrayEntity(level);
    await this.createPartsAndScrews(level);
  }

  /**
   * Creates the game state entity for tracking level progress.
   * @param level - The level definition
   * @example
   * this.createGameStateEntity(level);
   */
  private createGameStateEntity(level: LevelDefinition): void {
    const totalScrews = level.parts.reduce(
      (sum, part) => sum + part.screws.length,
      0
    );
    this.gameStateEntity = createEntity(GameStateEntity, {
      gameState: {
        phase: 'playing',
        totalScrews,
        removedScrews: 0,
        winConditionType: level.win.type,
      },
    });
    this.scene.addChild(this.gameStateEntity);
  }

  /**
   * Creates the buffer tray entity for the level.
   * @param level - The level definition
   * @example
   * await this.createBufferTrayEntity(level);
   */
  private async createBufferTrayEntity(level: LevelDefinition): Promise<void> {
    this.bufferTrayEntity = await createBufferTrayEntity({
      position: {
        x: GAME_LAYOUT.bufferTrayFrame.x,
        y: GAME_LAYOUT.bufferTrayFrame.y,
      },
      capacity: level.bufferCapacity ?? 5,
    });
    this.scene.addChild(this.bufferTrayEntity);
  }

  /**
   * Creates part and screw entities from level definition.
   *
   * Level data uses centered local coordinates where (0,0) is the center
   * of the play area. This method transforms those coordinates to world
   * coordinates for rendering.
   *
   * @param level - The level definition
   * @example
   * await this.createPartsAndScrews(level);
   */
  private async createPartsAndScrews(level: LevelDefinition): Promise<void> {
    // Sort parts by layer (low to high) so higher layers render on top and block clicks
    const sortedParts = [...level.parts].sort((a, b) => a.layer - b.layer);

    for (const partInstance of sortedParts) {
      const partDef = getPart(partInstance.partId);
      const partWorldPosition = localToWorld(partInstance.position);

      const partEntity = await createPartEntity({
        assetAlias: partDef.id,
        partDefinitionId: partDef.id,
        position: partWorldPosition,
        layer: partInstance.layer,
      });
      this.scene.addChild(partEntity);
      this.partEntities.push(partEntity);

      await this.createScrewsForPart(
        partInstance,
        partDef,
        partWorldPosition,
        partEntity
      );
    }
  }

  /**
   * Creates screw entities for a part instance.
   * @param partInstance - The part instance from level data
   * @param partDef - The part definition
   * @param partWorldPosition - The part's world position
   * @param partEntity - The created part entity
   * @internal
   */
  private async createScrewsForPart(
    partInstance: PartInstance,
    partDef: PartDefinition,
    partWorldPosition: Position,
    partEntity: Entity2D
  ): Promise<void> {
    // Get part dimensions - screws are relative to part's top-left corner
    const partWidth =
      partDef.collision.type === 'box' ? partDef.collision.width : 0;
    const partHeight =
      partDef.collision.type === 'box' ? partDef.collision.height : 0;

    for (const screw of partInstance.screws) {
      // Convert to world position: partCenter - halfSize + screwLocal
      const screwWorldPosition = {
        x: partWorldPosition.x - partWidth / 2 + screw.position.x,
        y: partWorldPosition.y - partHeight / 2 + screw.position.y,
      };
      const screwEntity = await createScrewEntity({
        color: screw.color,
        position: screwWorldPosition,
        partEntityId: String(partEntity.UID),
      });
      this.scene.addChild(screwEntity);
      this.screwEntities.push(screwEntity);
    }
  }

  /**
   * Clears all level entities (parts, screws, trays, game state, buffer tray).
   * @private
   */
  private clearLevel(): void {
    // Reset tick counter for new level
    gameTick.reset();

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

    // Remove tray entities (they're recreated per level)
    // Clear the coloredTrayLayer which holds tray views
    this.coloredTrayLayer.removeChildren();
    for (const tray of this.trayEntities.values()) {
      this.scene.removeChild(tray);
    }
    this.trayEntities.clear();

    // Remove part entities
    for (const entity of this.partEntities) {
      this.scene.removeChild(entity);
    }

    // Remove screw entities
    for (const entity of this.screwEntities) {
      this.scene.removeChild(entity);
    }

    // Clear animation layer (screws in buffer tray are left here after animation)
    this.animationLayer.removeChildren();

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
      const bundleName = `level-parts-${String(Date.now())}`;
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
    this.animationLayer.removeChildren();

    // Clear layer registry
    clearLayerRegistry();

    this.scene.reset();
  }
}
