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
  const assetMap = state === 'inBoard' ? SHORT_SCREW_ASSET_MAP : LONG_SCREW_ASSET_MAP;
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
  /** Whether the tray is hidden under a cover */
  isHidden?: boolean;
}

/**
 * Creates a colored tray entity with its sprite.
 *
 * @param options - Entity configuration
 * @returns Promise resolving to the created entity
 *
 * @example
 * const tray = await createTrayEntity({
 *   color: ScrewColor.Red,
 *   position: { x: 48, y: 175 },
 *   capacity: 3
 * });
 * scene.addChild(tray);
 */
export async function createTrayEntity(
  options: TrayEntityOptions
): Promise<Entity2D> {
  const assetAlias = TRAY_ASSET_MAP[options.color];
  const texture = await Assets.load<Texture>(assetAlias);

  const entity = createEntity(TrayEntity, {
    tray: {
      color: options.color,
      capacity: options.capacity ?? 3,
      screwCount: 0,
      isHidden: options.isHidden ?? false,
    },
  });

  const sprite = new Sprite(texture);

  gameVisualRegistry.set(entity, sprite);
  entity.view.addChild(sprite);
  entity.position.set(options.position.x, options.position.y);

  return entity;
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
