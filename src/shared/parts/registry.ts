/**
 * Part registry for looking up part definitions by ID.
 *
 * Parts are registered at module load time via `registerPart()`.
 * Use `getPart()` to retrieve a part definition by its ID.
 *
 * @module
 */

import type { PartDefinition } from '@shared/types';

/** Registry of all registered parts */
const parts = new Map<string, PartDefinition>();

/**
 * Register a part definition.
 *
 * @param part - The part definition to register
 * @throws Error if a part with the same ID is already registered
 *
 * @example
 * ```typescript
 * import { registerPart } from '@shared/parts/registry';
 *
 * const myPart: PartDefinition = {
 *   id: 'my-part',
 *   name: 'My Part',
 *   // ... other properties
 * };
 *
 * registerPart(myPart);
 * ```
 */
export function registerPart(part: PartDefinition): void {
  if (parts.has(part.id)) {
    throw new Error(`Part "${part.id}" is already registered`);
  }
  parts.set(part.id, part);
}

/**
 * Get a part definition by ID.
 *
 * @param id - The part ID to look up
 * @returns The part definition
 * @throws Error if the part ID is not found
 *
 * @example
 * ```typescript
 * import { getPart } from '@shared/parts/registry';
 *
 * const part = getPart('simple-plate');
 * console.log(part.name); // "Simple Plate"
 * ```
 */
export function getPart(id: string): PartDefinition {
  const part = parts.get(id);
  if (!part) {
    throw new Error(`Part "${id}" not found in registry`);
  }
  return part;
}

/**
 * Check if a part ID is registered.
 *
 * @param id - The part ID to check
 * @returns true if the part is registered
 *
 * @example
 * ```typescript
 * if (hasPart('simple-plate')) {
 *   const part = getPart('simple-plate');
 * }
 * ```
 */
export function hasPart(id: string): boolean {
  return parts.has(id);
}

/**
 * Get all registered part IDs.
 *
 * @returns Array of all registered part IDs
 *
 * @example
 * ```typescript
 * const ids = getAllPartIds();
 * console.log('Available parts:', ids.join(', '));
 * ```
 */
export function getAllPartIds(): string[] {
  return Array.from(parts.keys());
}

/**
 * Get all registered part definitions.
 *
 * @returns Array of all registered part definitions
 *
 * @example
 * ```typescript
 * const parts = getAllParts();
 * parts.forEach(part => console.log(part.name));
 * ```
 */
export function getAllParts(): PartDefinition[] {
  return Array.from(parts.values());
}

/**
 * Clear all registered parts.
 *
 * Primarily useful for testing.
 *
 * @example
 * ```typescript
 * beforeEach(() => clearRegistry());
 * ```
 */
export function clearRegistry(): void {
  parts.clear();
}
