/**
 * Part definitions barrel export.
 *
 * Importing this module registers all part definitions with the registry.
 *
 * @module
 */

// Import all part definitions to trigger registration
import './simple-plate';
import './sliding-cover';

// Re-export for direct access if needed
export { simplePlate } from './simple-plate';
export { slidingCover } from './sliding-cover';
