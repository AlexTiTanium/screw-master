/**
 * Factory functions for creating game entities (screws, parts, trays).
 *
 * These factories encapsulate the entity creation, visual setup, and positioning
 * in a single call, reducing boilerplate and centralizing entity creation logic.
 *
 * @module
 */

import { createEntity, type Entity2D } from '@play-co/odie';
import { Assets, type Container, Sprite, type Texture } from 'pixi.js';

import type { Position } from '@shared/types';
import { ScrewColor } from '@shared/types';
import { ScrewEntity } from '../entities/ScrewEntity';
import { PartEntity } from '../entities/PartEntity';
import { TrayEntity } from '../entities/TrayEntity';
import { BufferTrayEntity } from '../entities/BufferTrayEntity';
import type { ScrewState } from '../components';

/**
 * WeakMap registry for storing visual references.
 */
const gameVisualRegistry = new WeakMap<Entity2D, Container>();

/**
 * Gets the visual display object from a game entity.
 *
 * @param entity - The entity to get the visual from
 * @returns The visual container or undefined if not found
 *
 * @example
 * const screw = await createScrewEntity({ color: ScrewColor.Blue, position: { x: 0, y: 0 } });
 * const sprite = getGameVisual(screw) as Sprite;
 */
export function getGameVisual(entity: Entity2D): Container | undefined {
  return gameVisualRegistry.get(entity);
}

/**
 * Maps screw color to short screw asset alias (used when screw is in board).
 */
const SHORT_SCREW_ASSET_MAP: Record<ScrewColor, string> = {
  [ScrewColor.Red]: 'short-screw-red',
  [ScrewColor.Yellow]: 'short-screw-yellow',
  [ScrewColor.Green]: 'short-screw-green',
  [ScrewColor.Blue]: 'short-screw-blue',
};

/**
 * Maps screw color to long screw asset alias (used when screw is removed).
 */
const LONG_SCREW_ASSET_MAP: Record<ScrewColor, string> = {
  [ScrewColor.Red]: 'screw-red',
  [ScrewColor.Yellow]: 'screw-yellow',
  [ScrewColor.Green]: 'screw-green',
  [ScrewColor.Blue]: 'screw-blue',
};

/**
 * Maps screw color to tray asset alias.
 */
const TRAY_ASSET_MAP: Record<ScrewColor, string> = {
  [ScrewColor.Red]: 'tray-red',
  [ScrewColor.Yellow]: 'tray-yellow',
  [ScrewColor.Green]: 'tray-green',
  [ScrewColor.Blue]: 'tray-blue',
};

/**
 * Maps screw color to placeholder asset alias.
 */
const PLACEHOLDER_ASSET_MAP: Record<ScrewColor, string> = {
  [ScrewColor.Red]: 'placeholder-red',
  [ScrewColor.Yellow]: 'placeholder-yellow',
  [ScrewColor.Green]: 'placeholder-green',
  [ScrewColor.Blue]: 'placeholder-blue',
};

/**
 * Tray sprite width for centering calculations.
 * Updated for new Figma design (was 200, now 185).
 */
const TRAY_WIDTH = 185;

/**
 * Placeholder display width (new assets are 40x50, no scaling needed).
 */
const PLACEHOLDER_DISPLAY_WIDTH = 40;

/**
 * Spacing between placeholder sprite centers.
 * Adjusted for smaller tray width.
 */
const PLACEHOLDER_SPACING = 40;

/**
 * Y position for placeholders within tray.
 * Centered vertically in 150px tray height.
 */
const PLACEHOLDER_Y = 75;

/**
 * WeakMap registry for storing placeholder sprite references.
 */
const placeholderRegistry = new WeakMap<Entity2D, Sprite[]>();

/**
 * Gets the placeholder sprites from a tray entity.
 *
 * @param entity - The tray entity to get placeholders from
 * @returns Array of placeholder sprites or undefined if not found
 *
 * @example
 * const placeholders = getTrayPlaceholders(trayEntity);
 * if (placeholders) placeholders[0].alpha = 0; // Hide first placeholder
 */
export function getTrayPlaceholders(entity: Entity2D): Sprite[] | undefined {
  return placeholderRegistry.get(entity);
}

// ============================================================================
// Screw Entity Factory
// ============================================================================

/**
 * Options for creating a screw entity.
 */
export interface ScrewEntityOptions {
  /** Screw color */
  color: ScrewColor;
  /** Position to place the screw (world coordinates) */
  position: Position;
  /** Initial state (defaults to 'inBoard') */
  state?: ScrewState;
  /** ID of the parent part entity */
  partEntityId?: string;
}

/**
 * Creates a screw entity with its sprite.
 *
 * @param options - Entity configuration
 * @returns Promise resolving to the created entity
 *
 * @example
 * const screw = await createScrewEntity({
 *   color: ScrewColor.Blue,
 *   position: { x: 100, y: 100 }
 * });
 * scene.addChild(screw);
 */
export async function createScrewEntity(
  options: ScrewEntityOptions
): Promise<Entity2D> {
  const state = options.state ?? 'inBoard';

  // Use short screw when in board, long screw when removed
  const assetMap =
    state === 'inBoard' ? SHORT_SCREW_ASSET_MAP : LONG_SCREW_ASSET_MAP;
  const assetAlias = assetMap[options.color];
  const texture = await Assets.load<Texture>(assetAlias);

  const entity = createEntity(ScrewEntity, {
    screw: {
      color: options.color,
      state,
      partEntityId: options.partEntityId ?? '',
    },
  });

  const sprite = new Sprite(texture);
  sprite.anchor.set(0.5); // Center anchor for rotation

  gameVisualRegistry.set(entity, sprite);
  entity.view.addChild(sprite);
  entity.position.set(options.position.x, options.position.y);

  return entity;
}

// ============================================================================
// Part Entity Factory
// ============================================================================

/**
 * Options for creating a part entity.
 */
export interface PartEntityOptions {
  /** Asset alias for the part sprite */
  assetAlias: string;
  /** Part definition ID (for component data) */
  partDefinitionId: string;
  /** Position to place the part */
  position: Position;
  /** Z-order layer (defaults to 0) */
  layer?: number;
}

/**
 * Creates a part (board) entity with its sprite.
 *
 * @param options - Entity configuration
 * @returns Promise resolving to the created entity
 *
 * @example
 * const board = await createPartEntity({
 *   assetAlias: 'board-walnut-square',
 *   partDefinitionId: 'board-walnut-square',
 *   position: { x: 200, y: 300 },
 *   layer: 1
 * });
 * scene.addChild(board);
 */
export async function createPartEntity(
  options: PartEntityOptions
): Promise<Entity2D> {
  const texture = await Assets.load<Texture>(options.assetAlias);

  const entity = createEntity(PartEntity, {
    part: {
      partDefinitionId: options.partDefinitionId,
      layer: options.layer ?? 0,
      screwCount: 0,
      state: 'static',
    },
  });

  const sprite = new Sprite(texture);
  sprite.anchor.set(0.5); // Center anchor for centered coordinate system
  sprite.eventMode = 'static'; // Block clicks from reaching screws underneath

  gameVisualRegistry.set(entity, sprite);
  entity.view.addChild(sprite);
  entity.position.set(options.position.x, options.position.y);

  return entity;
}

// ============================================================================
// Tray Entity Factory
// ============================================================================

/**
 * Options for creating a tray entity.
 */
export interface TrayEntityOptions {
  /** Tray color */
  color: ScrewColor;
  /** Position to place the tray */
  position: Position;
  /** Maximum screw capacity (defaults to 3) */
  capacity?: number;
  /** Display order (0-3): 0-1 are visible, 2-3 are hidden */
  displayOrder?: number;
}

/**
 * Creates a colored tray entity with its sprite and placeholder sprites.
 *
 * Placeholders are semi-transparent screw outlines that show where screws
 * should be placed. They fade out when a screw is placed in their slot.
 *
 * @param options - Entity configuration
 * @returns Promise resolving to the created entity
 *
 * @example
 * const tray = await createTrayEntity({
 *   color: ScrewColor.Red,
 *   position: { x: 48, y: 175 },
 *   capacity: 3,
 *   displayOrder: 0
 * });
 * scene.addChild(tray);
 */
export async function createTrayEntity(
  options: TrayEntityOptions
): Promise<Entity2D> {
  const capacity = options.capacity ?? 3;
  const displayOrder = options.displayOrder ?? 0;

  const [trayTexture, placeholderTexture] = await loadTrayTextures(
    options.color
  );
  const entity = createTrayEntityWithComponent(
    options.color,
    capacity,
    displayOrder
  );
  setupTraySprite(entity, trayTexture);
  setupPlaceholders(entity, placeholderTexture, capacity);
  entity.position.set(options.position.x, options.position.y);

  return entity;
}

function loadTrayTextures(color: ScrewColor): Promise<[Texture, Texture]> {
  return Promise.all([
    Assets.load<Texture>(TRAY_ASSET_MAP[color]),
    Assets.load<Texture>(PLACEHOLDER_ASSET_MAP[color]),
  ]);
}

function createTrayEntityWithComponent(
  color: ScrewColor,
  capacity: number,
  displayOrder: number
): Entity2D {
  return createEntity(TrayEntity, {
    tray: { color, capacity, screwCount: 0, displayOrder, isAnimating: false },
  });
}

function setupTraySprite(entity: Entity2D, texture: Texture): void {
  const traySprite = new Sprite(texture);
  gameVisualRegistry.set(entity, traySprite);
  entity.view.addChild(traySprite);
}

function setupPlaceholders(
  entity: Entity2D,
  texture: Texture,
  capacity: number
): void {
  const placeholders: Sprite[] = [];

  // Calculate centered positions for placeholders within tray
  const totalWidth =
    (capacity - 1) * PLACEHOLDER_SPACING + PLACEHOLDER_DISPLAY_WIDTH;
  const startX = (TRAY_WIDTH - totalWidth) / 2 + PLACEHOLDER_DISPLAY_WIDTH / 2;

  for (let i = 0; i < capacity; i++) {
    const placeholder = new Sprite(texture);
    placeholder.anchor.set(0.5);
    // No scaling needed - new assets are already 40x50
    placeholder.position.set(startX + i * PLACEHOLDER_SPACING, PLACEHOLDER_Y);
    placeholder.alpha = 0.7;
    entity.view.addChild(placeholder);
    placeholders.push(placeholder);
  }
  placeholderRegistry.set(entity, placeholders);
}

// ============================================================================
// Buffer Tray Entity Factory
// ============================================================================

/**
 * Options for creating a buffer tray entity.
 */
export interface BufferTrayEntityOptions {
  /** Position to place the buffer tray */
  position: Position;
  /** Maximum screw capacity (defaults to 5) */
  capacity?: number;
}

/**
 * Creates a buffer tray entity with its sprite.
 *
 * @param options - Entity configuration
 * @returns Promise resolving to the created entity
 *
 * @example
 * const buffer = await createBufferTrayEntity({
 *   position: { x: 136, y: 405 },
 *   capacity: 5
 * });
 * scene.addChild(buffer);
 */
export async function createBufferTrayEntity(
  options: BufferTrayEntityOptions
): Promise<Entity2D> {
  const texture = await Assets.load<Texture>('buffer-tray-frame');

  const entity = createEntity(BufferTrayEntity, {
    bufferTray: {
      capacity: options.capacity ?? 5,
      screwIds: [],
    },
  });

  const sprite = new Sprite(texture);

  gameVisualRegistry.set(entity, sprite);
  entity.view.addChild(sprite);
  entity.position.set(options.position.x, options.position.y);

  return entity;
}
