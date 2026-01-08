/**
 * Part system exports.
 *
 * @module
 */

// Registry functions
export {
  registerPart,
  getPart,
  hasPart,
  getAllPartIds,
  getAllParts,
  clearRegistry,
} from './registry';

// Part definitions (importing registers them)
export * from './definitions';
