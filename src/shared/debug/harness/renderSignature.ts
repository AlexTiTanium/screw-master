/**
 * Render Signature Generation
 *
 * This module creates deterministic snapshots of the render state that can
 * be used to detect changes between frames. The signature includes all
 * entity state and a hash for quick comparison.
 *
 * @example
 * // Check if render state changed
 * const sig1 = harness.getRenderSignature();
 * // ... perform action ...
 * const sig2 = harness.getRenderSignature();
 *
 * if (sig1.hash !== sig2.hash) {
 *   console.log('Render state changed');
 * }
 *
 * @module
 */

import type { EntitySnapshot, RenderSignature } from '../types';

/** Frame counter for tracking render iterations */
let frameCounter = 0;

/**
 * Creates a simple hash from a string using the djb2 algorithm.
 *
 * This provides fast, reasonably distributed hashes suitable for
 * quick equality comparisons (not cryptographic use).
 *
 * @param str - String to hash
 * @returns Hexadecimal hash string
 * @internal
 */
function simpleHash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) + hash + char; // hash * 33 + char
    hash = hash & hash; // Convert to 32bit integer
  }
  // Convert to unsigned and then to hex
  return (hash >>> 0).toString(16);
}

/**
 * Converts an entity snapshot to a deterministic string for hashing.
 *
 * The string includes all entity properties in a consistent order
 * to ensure the same entity state always produces the same string.
 *
 * @param entity - Entity snapshot to convert
 * @returns Deterministic string representation
 * @internal
 */
function entityToHashString(entity: EntitySnapshot): string {
  const pos = `${entity.position.x.toFixed(2)},${entity.position.y.toFixed(2)}`;
  const scale = `${entity.scale.x.toFixed(2)},${entity.scale.y.toFixed(2)}`;
  const rot = entity.rotation.toFixed(4);
  const vis = entity.visible ? '1' : '0';
  const alpha = entity.alpha.toFixed(2);

  // Sort component keys for determinism
  const componentKeys = Object.keys(entity.components).sort();
  const componentsStr = componentKeys
    .map((k) => `${k}:${JSON.stringify(entity.components[k])}`)
    .join(';');

  const idStr =
    typeof entity.id === 'number' ? entity.id.toString() : entity.id;
  return `${idStr}|${entity.type}|${pos}|${scale}|${rot}|${vis}|${alpha}|${componentsStr}`;
}

/**
 * Creates a render signature generator function.
 *
 * The generator captures the current state of all entities and produces
 * a RenderSignature object with a deterministic hash. This can be used
 * to detect state changes between calls.
 *
 * @param getEntities - Function that returns all entity snapshots
 * @param getSceneState - Function that returns current scene state
 * @returns Function that generates RenderSignature on each call
 *
 * @example
 * const getRenderSignature = createRenderSignatureGenerator(
 *   () => ecsAccess.getEntities(),
 *   () => sceneState
 * );
 *
 * const sig = getRenderSignature();
 * console.log(`Frame ${sig.frame}: ${sig.entityCount} entities, hash=${sig.hash}`);
 */
export function createRenderSignatureGenerator(
  getEntities: () => EntitySnapshot[],
  getSceneState: () => 'running' | 'paused' | 'stopped'
): () => RenderSignature {
  return (): RenderSignature => {
    const entities = getEntities();
    const timestamp = performance.now();
    const currentFrame = frameCounter++;

    // Sort entities by ID for deterministic ordering
    // Handle both string and numeric IDs
    const sortedEntities = [...entities].sort((a, b) => {
      const aId = typeof a.id === 'number' ? a.id.toString() : a.id;
      const bId = typeof b.id === 'number' ? b.id.toString() : b.id;
      return aId.localeCompare(bId);
    });

    // Generate deterministic hash from entity state
    const hashInput = sortedEntities.map(entityToHashString).join('||');
    const hash = simpleHash(hashInput);

    return {
      timestamp,
      frame: currentFrame,
      entityCount: entities.length,
      entities: sortedEntities,
      systems: [], // TODO: Extract system names from Scene2D if accessible
      sceneState: getSceneState(),
      hash,
    };
  };
}

/**
 * Resets the frame counter to zero.
 *
 * Useful for unit tests that need deterministic frame numbers.
 * Not typically needed in E2E tests.
 *
 * @example
 * // In unit test setup
 * beforeEach(() => {
 *   resetFrameCounter();
 * });
 */
export function resetFrameCounter(): void {
  frameCounter = 0;
}
