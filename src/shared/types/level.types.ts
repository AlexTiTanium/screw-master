/**
 * Type definitions for levels and regions.
 *
 * Level data is stored in JSON files. Each level references parts
 * by ID and specifies placement, screws, and tray configuration.
 *
 * @module
 */

import type { Position } from './game.types';
import type { ScrewColor } from './parts.types';

/**
 * A screw placed on a part instance.
 */
export interface ScrewPlacement {
  /** Position relative to part origin (local coordinates) */
  position: Position;
  /** Color of this screw (determines tray destination) */
  color: ScrewColor;
}

/**
 * A part instance in a level.
 *
 * References a PartDefinition by ID and specifies instance-specific
 * properties like position, layer, and attached screws.
 */
export interface PartInstance {
  /** References PartDefinition.id */
  partId: string;
  /** World position (x, y) */
  position: Position;
  /** Z-order layer (higher values render on top) */
  layer: number;
  /** Initial rotation in degrees (default: 0) */
  rotation?: number;
  /** Screws attached to this part instance */
  screws: ScrewPlacement[];
}

/**
 * Tray configuration for a level.
 *
 * The game has 5 tray slots. Array order determines display order:
 * - Index 0-1: Initially visible trays (left to right)
 * - Index 2-4: Hidden trays (revealed when visible trays complete)
 *
 * Levels can use 4-5 trays depending on puzzle design.
 */
export interface TrayConfig {
  /** Which color this tray accepts */
  color: ScrewColor;
  /** Maximum screw capacity (1-4) */
  capacity: number;
}

/**
 * Win condition: remove all screws from the puzzle.
 */
export interface AllScrewsRemovedWin {
  type: 'allScrewsRemoved';
}

/**
 * Win condition: remove specific parts from the puzzle.
 */
export interface PartsRemovedWin {
  type: 'partsRemoved';
  /** Part instance indices that must be removed */
  partIndices: number[];
}

/**
 * Win condition: free a specific part (all its screws removed).
 */
export interface TargetFreedWin {
  type: 'targetFreed';
  /** Index of the part instance that must be freed */
  targetPartIndex: number;
}

/**
 * Union of all win condition types.
 */
export type WinCondition =
  | AllScrewsRemovedWin
  | PartsRemovedWin
  | TargetFreedWin;

/**
 * Level definition - stored in JSON.
 *
 * Contains only data that varies per level. Constant part properties
 * (shape, physics, materials) are defined in PartDefinition.
 */
export interface LevelDefinition {
  /** Level format version for migrations */
  version: 1;
  /** Unique level identifier within the region */
  id: string;
  /** Display name */
  name: string;
  /** Part instances in this level */
  parts: PartInstance[];
  /** Tray configuration (4-5 trays, array index = displayOrder) */
  trays: TrayConfig[];
  /** Buffer tray capacity (default: 5) */
  bufferCapacity?: number;
  /** Win condition */
  win: WinCondition;
}

/**
 * Region definition - a collection of 10 levels.
 *
 * Stored as a single JSON file per region.
 */
export interface RegionDefinition {
  /** Region format version for migrations */
  version: 1;
  /** Unique region identifier (e.g., 'workshop') */
  id: string;
  /** Display name (e.g., 'The Workshop') */
  name: string;
  /** Ordered list of levels */
  levels: LevelDefinition[];
}
