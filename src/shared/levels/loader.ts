/**
 * Level and region loading with validation.
 *
 * @module
 */

import type {
  LevelDefinition,
  RegionDefinition,
  PartInstance,
  ScrewPlacement,
} from '@shared/types';
import { getPart, hasPart } from '@shared/parts';
import {
  isScrewInBounds,
  SCREW_RADIUS,
  isPartInPlayArea,
  getPartBoundsInfo,
  PLAY_AREA,
} from '@shared/utils';

/**
 * Validation error with context.
 */
export interface ValidationError {
  /** Error message */
  message: string;
  /** Path to the error location (e.g., "parts[0].screws[1]") */
  path: string;
}

/**
 * Validation result.
 */
export interface ValidationResult {
  /** Whether the validation passed */
  valid: boolean;
  /** List of errors (empty if valid) */
  errors: ValidationError[];
  /** List of warnings (non-fatal issues) */
  warnings: ValidationError[];
}

/**
 * Validate a screw placement against its part definition.
 *
 * Checks that the screw position is within the part's collision bounds,
 * accounting for the screw radius.
 *
 * @param screw - The screw placement to validate
 * @param partInstance - The part instance containing this screw
 * @param screwIndex - Index of the screw in the part's screws array
 * @param partIndex - Index of the part in the level's parts array
 * @returns Validation error if invalid, null if valid
 *
 * @example
 * ```typescript
 * const error = validateScrewPlacement(screw, part, 0, 1);
 * if (error) console.error(error.message);
 * ```
 */
function validateScrewPlacement(
  screw: ScrewPlacement,
  partInstance: PartInstance,
  screwIndex: number,
  partIndex: number
): ValidationError | null {
  const partDef = getPart(partInstance.partId);

  if (!isScrewInBounds(screw.position, partDef.collision)) {
    const boundsDesc =
      partDef.collision.type === 'box'
        ? `${String(partDef.collision.width)}x${String(partDef.collision.height)}`
        : `${String(partDef.collision.points.length)}-point polygon`;

    return {
      message: `Screw at (${String(screw.position.x)}, ${String(screw.position.y)}) extends beyond part bounds (${boundsDesc}). Screw radius is ${String(SCREW_RADIUS)}px.`,
      path: `parts[${String(partIndex)}].screws[${String(screwIndex)}].position`,
    };
  }

  return null;
}

/**
 * Get collision box dimensions from a part definition.
 * @param partId - The part ID to look up
 * @returns Width and height of the part's collision box
 */
function getPartDimensions(partId: string): { width: number; height: number } {
  const partDef = getPart(partId);
  if (partDef.collision.type === 'box') {
    return { width: partDef.collision.width, height: partDef.collision.height };
  }
  // For polygon collisions, calculate bounding box
  const points = partDef.collision.points;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  return {
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  };
}

/**
 * Format exceeded bounds into human-readable strings.
 * @param info - Bounds info from getPartBoundsInfo
 * @returns Array of exceeded boundary descriptions
 */
function formatExceededBounds(
  info: ReturnType<typeof getPartBoundsInfo>
): string[] {
  const result: string[] = [];
  if (info.exceedsLeft)
    result.push(
      `left (${String(info.leftEdge)} < ${String(PLAY_AREA.bounds.minX)})`
    );
  if (info.exceedsRight)
    result.push(
      `right (${String(info.rightEdge)} > ${String(PLAY_AREA.bounds.maxX)})`
    );
  if (info.exceedsTop)
    result.push(
      `top (${String(info.topEdge)} < ${String(PLAY_AREA.bounds.minY)})`
    );
  if (info.exceedsBottom)
    result.push(
      `bottom (${String(info.bottomEdge)} > ${String(PLAY_AREA.bounds.maxY)})`
    );
  return result;
}

/**
 * Validate that a part instance fits within the play area boundaries.
 * @param part - The part instance to validate
 * @param partIndex - Index of the part in the level's parts array
 * @returns Validation error if part exceeds boundaries, null if valid
 */
function validatePartPlayAreaBounds(
  part: PartInstance,
  partIndex: number
): ValidationError | null {
  const { width, height } = getPartDimensions(part.partId);
  if (isPartInPlayArea(part.position, width, height)) return null;

  const boundsInfo = getPartBoundsInfo(part.position, width, height);
  const exceeded = formatExceededBounds(boundsInfo);
  const pos = `(${String(part.position.x)}, ${String(part.position.y)})`;
  const size = `${String(width)}x${String(height)}`;

  return {
    message: `Part "${part.partId}" at ${pos} with size ${size} exceeds play area bounds. Exceeded: ${exceeded.join(', ')}`,
    path: `parts[${String(partIndex)}].position`,
  };
}

/** Result type for part instance validation. */
interface PartValidationResult {
  errors: ValidationError[];
  warnings: ValidationError[];
}

/**
 * Validate a part instance for unknown parts, play area bounds, and screw positions.
 * @param part - The part instance to validate
 * @param partIndex - Index of the part in the level's parts array
 * @returns Object containing errors and warnings arrays
 */
function validatePartInstance(
  part: PartInstance,
  partIndex: number
): PartValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!hasPart(part.partId)) {
    const path = `parts[${String(partIndex)}].partId`;
    errors.push({ message: `Unknown part "${part.partId}"`, path });
    return { errors, warnings };
  }

  const boundsError = validatePartPlayAreaBounds(part, partIndex);
  if (boundsError) errors.push(boundsError);

  const usedPositions = new Set<string>();
  part.screws.forEach((screw, i) => {
    const screwError = validateScrewPlacement(screw, part, i, partIndex);
    if (screwError) errors.push(screwError);

    const posKey = `${String(screw.position.x)},${String(screw.position.y)}`;
    if (usedPositions.has(posKey)) {
      const path = `parts[${String(partIndex)}].screws[${String(i)}].position`;
      const msg = `Multiple screws at position (${String(screw.position.x)}, ${String(screw.position.y)})`;
      warnings.push({ message: msg, path });
    }
    usedPositions.add(posKey);
  });

  return { errors, warnings };
}

/**
 * Validate tray capacities in a level.
 *
 * @param level - The level to validate
 * @returns Array of validation errors for invalid tray capacities
 *
 * @example
 * ```typescript
 * const errors = validateTrayCapacities(level);
 * ```
 */
function validateTrayCapacities(level: LevelDefinition): ValidationError[] {
  const errors: ValidationError[] = [];
  level.trays.forEach((tray, i) => {
    if (tray.capacity < 1 || tray.capacity > 4) {
      errors.push({
        message: `Tray capacity must be 1-4, got ${String(tray.capacity)}`,
        path: `trays[${String(i)}].capacity`,
      });
    }
  });
  return errors;
}

/**
 * Validate parts in a level and detect layer conflicts.
 *
 * @param level - The level to validate
 * @returns Object with errors and warnings arrays
 *
 * @example
 * ```typescript
 * const result = validateLevelParts(level);
 * ```
 */
function validateLevelParts(level: LevelDefinition): {
  errors: ValidationError[];
  warnings: ValidationError[];
} {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const layerCounts = new Map<number, number>();

  level.parts.forEach((part, i) => {
    const partResult = validatePartInstance(part, i);
    errors.push(...partResult.errors);
    warnings.push(...partResult.warnings);
    const count = layerCounts.get(part.layer) ?? 0;
    layerCounts.set(part.layer, count + 1);
  });

  for (const [layer, count] of layerCounts) {
    if (count > 1) {
      warnings.push({
        message: `${String(count)} parts share layer ${String(layer)} - occlusion order may be ambiguous`,
        path: 'parts',
      });
    }
  }

  return { errors, warnings };
}

/**
 * Validate win condition references in a level.
 *
 * @param level - The level to validate
 * @returns Array of validation errors for invalid win conditions
 *
 * @example
 * ```typescript
 * const errors = validateWinCondition(level);
 * ```
 */
function validateWinCondition(level: LevelDefinition): ValidationError[] {
  const errors: ValidationError[] = [];

  if (level.win.type === 'partsRemoved') {
    for (const partIndex of level.win.partIndices) {
      if (partIndex < 0 || partIndex >= level.parts.length) {
        errors.push({
          message: `Invalid part index ${String(partIndex)} in win condition (valid: 0-${String(level.parts.length - 1)})`,
          path: 'win.partIndices',
        });
      }
    }
  } else if (level.win.type === 'targetFreed') {
    const { targetPartIndex } = level.win;
    if (targetPartIndex < 0 || targetPartIndex >= level.parts.length) {
      errors.push({
        message: `Invalid target part index ${String(targetPartIndex)} in win condition`,
        path: 'win.targetPartIndex',
      });
    }
  }

  return errors;
}

/**
 * Validate a level definition.
 *
 * @param level - The level to validate
 * @returns Validation result with errors and warnings
 *
 * @example
 * ```typescript
 * const result = validateLevel(level);
 * if (!result.valid) {
 *   console.error('Level validation failed:', result.errors);
 * }
 * ```
 */
export function validateLevel(level: LevelDefinition): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  errors.push(...validateTrayCapacities(level));

  if (level.bufferCapacity !== undefined && level.bufferCapacity < 1) {
    errors.push({
      message: `Buffer capacity must be at least 1, got ${String(level.bufferCapacity)}`,
      path: 'bufferCapacity',
    });
  }

  const partsResult = validateLevelParts(level);
  errors.push(...partsResult.errors);
  warnings.push(...partsResult.warnings);

  errors.push(...validateWinCondition(level));

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Append level validation results with path prefix.
 *
 * @param levelResult - Result from validateLevel
 * @param index - Level index for path prefixing
 * @param errors - Errors array to append to
 * @param warnings - Warnings array to append to
 *
 * @example
 * ```typescript
 * appendLevelResults(validateLevel(level), 0, errors, warnings);
 * ```
 */
function appendLevelResults(
  levelResult: ValidationResult,
  index: number,
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  for (const error of levelResult.errors) {
    errors.push({
      message: error.message,
      path: `levels[${String(index)}].${error.path}`,
    });
  }
  for (const warning of levelResult.warnings) {
    warnings.push({
      message: warning.message,
      path: `levels[${String(index)}].${warning.path}`,
    });
  }
}

/**
 * Validate individual levels within a region.
 *
 * @param region - The region to validate
 * @returns Object with errors and warnings arrays
 *
 * @example
 * ```typescript
 * const result = validateRegionLevelContents(region);
 * ```
 */
function validateRegionLevelContents(region: RegionDefinition): {
  errors: ValidationError[];
  warnings: ValidationError[];
} {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const levelIds = new Set<string>();

  region.levels.forEach((level, i) => {
    if (levelIds.has(level.id)) {
      errors.push({
        message: `Duplicate level ID "${level.id}"`,
        path: `levels[${String(i)}].id`,
      });
    }
    levelIds.add(level.id);
    appendLevelResults(validateLevel(level), i, errors, warnings);
  });

  return { errors, warnings };
}

/**
 * Validate a region definition.
 *
 * @param region - The region to validate
 * @returns Validation result with errors and warnings
 *
 * @example
 * ```typescript
 * const result = validateRegion(region);
 * if (!result.valid) {
 *   console.error('Region validation failed:', result.errors);
 * }
 * ```
 */
export function validateRegion(region: RegionDefinition): ValidationResult {
  const warnings: ValidationError[] = [];

  if (region.levels.length !== 10) {
    warnings.push({
      message: `Expected 10 levels, got ${String(region.levels.length)}`,
      path: 'levels',
    });
  }

  const levelContents = validateRegionLevelContents(region);

  return {
    valid: levelContents.errors.length === 0,
    errors: levelContents.errors,
    warnings: [...warnings, ...levelContents.warnings],
  };
}

/**
 * Load and validate a region from a JSON file.
 *
 * @param path - Path to the region JSON file
 * @returns The validated region definition
 * @throws Error if loading or validation fails
 *
 * @example
 * ```typescript
 * const region = await loadRegion('regions/region-1.json');
 * console.log(`Loaded region "${region.name}"`);
 * ```
 */
export async function loadRegion(path: string): Promise<RegionDefinition> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(
      `Failed to load region from ${path}: ${String(response.status)}`
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const region: RegionDefinition = await response.json();
  const result = validateRegion(region);

  if (!result.valid) {
    const errorMessages = result.errors
      .map((e) => `  ${e.path}: ${e.message}`)
      .join('\n');
    throw new Error(
      `Region "${region.id}" validation failed:\n${errorMessages}`
    );
  }

  return region;
}

/**
 * Get a specific level from a region by ID.
 *
 * @param region - The region to search
 * @param levelId - The level ID to find
 * @returns The level definition
 * @throws Error if level is not found
 *
 * @example
 * ```typescript
 * const level = getLevelById(region, 'workshop-01');
 * console.log(level.name);
 * ```
 */
export function getLevelById(
  region: RegionDefinition,
  levelId: string
): LevelDefinition {
  const level = region.levels.find((l) => l.id === levelId);
  if (!level) {
    throw new Error(`Level "${levelId}" not found in region "${region.id}"`);
  }
  return level;
}

/**
 * Get a specific level from a region by index.
 *
 * @param region - The region to search
 * @param index - The level index (0-based)
 * @returns The level definition
 * @throws Error if index is out of bounds
 *
 * @example
 * ```typescript
 * const level = getLevelByIndex(region, 0);
 * console.log(level.name);
 * ```
 */
export function getLevelByIndex(
  region: RegionDefinition,
  index: number
): LevelDefinition {
  const level = region.levels[index];
  if (level === undefined) {
    throw new Error(
      `Level index ${String(index)} out of bounds (0-${String(region.levels.length - 1)})`
    );
  }
  return level;
}
