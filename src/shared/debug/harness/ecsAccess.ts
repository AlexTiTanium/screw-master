/**
 * ECS Access Layer for Test Harness
 *
 * This module provides the ECS access implementation that allows E2E tests
 * to inspect ODIE entities and their components. It handles serialization
 * of entity state to plain objects for cross-context access.
 *
 * @example
 * // In E2E tests, access via the harness
 * const entities = await page.evaluate(() =>
 *   window.__gameTest?.ecs.getEntities()
 * );
 *
 * @module
 */

import type { EntitySnapshot, ECSAccess } from '../types';

/**
 * Internal interface for ECS access that includes the scene setter.
 *
 * The `_setScene` method is used internally by the harness when a scene
 * is registered. Application code should use `registerScene()` on the
 * harness instead.
 */
export interface ECSAccessInternal extends ECSAccess {
  /**
   * Internal method to set the scene reference.
   * @internal
   */
  _setScene(scene: unknown): void;
}

/**
 * Serializes a component instance to a plain object.
 *
 * Handles:
 * - Primitive values (copied directly)
 * - Arrays (copied directly)
 * - Objects (JSON serialized)
 * - Functions and private properties (skipped)
 *
 * @param component - The component instance to serialize
 * @returns Plain object with component data
 */
function serializeComponent(component: unknown): unknown {
  if (component === null || component === undefined) {
    return null;
  }

  const result: Record<string, unknown> = {};
  const comp = component as Record<string, unknown>;

  for (const key of Object.keys(comp)) {
    const value = comp[key];

    // Skip functions, private properties, and constructor
    if (
      typeof value === 'function' ||
      key.startsWith('_') ||
      key === 'constructor'
    ) {
      continue;
    }

    // Handle primitives
    if (value === null || typeof value !== 'object') {
      result[key] = value;
      continue;
    }

    // Handle arrays
    if (Array.isArray(value)) {
      result[key] = value;
      continue;
    }

    // Try to serialize objects, fallback to a string representation
    try {
      result[key] = JSON.parse(JSON.stringify(value)) as unknown;
    } catch {
      // Use JSON.stringify for objects that can't be round-tripped
      try {
        result[key] = JSON.stringify(value);
      } catch {
        result[key] = '[object]';
      }
    }
  }

  return result;
}

/**
 * Serializes an ODIE Entity2D to an EntitySnapshot.
 *
 * Extracts:
 * - Entity ID (UID)
 * - Constructor name (type)
 * - Transform properties (position, scale, rotation)
 * - Visual properties (visible, alpha)
 * - View bounds
 * - Component data (serialized)
 * - Child count
 *
 * @param entity - The ODIE entity to serialize
 * @returns EntitySnapshot with serialized entity state
 */
function serializeEntity(entity: unknown): EntitySnapshot {
  const e = entity as {
    UID?: string; // ODIE uses UID (uppercase)
    uid?: string;
    constructor?: { name: string };
    position?: { x: number; y: number };
    scale?: { x: number; y: number };
    rotation?: number;
    visible?: boolean;
    alpha?: number;
    view?: {
      getBounds?: () => { x: number; y: number; width: number; height: number };
      children?: unknown[];
    };
    // ODIE stores components in 'c' property as Map or object
    c?: Map<string, unknown> | Record<string, unknown>;
    components?: Map<string, unknown> | Record<string, unknown>;
  };

  // Extract component data - ODIE stores components in 'c' property
  const components: Record<string, unknown> = {};
  const componentSource = e.c ?? e.components;

  if (componentSource instanceof Map) {
    componentSource.forEach((component, name) => {
      components[name] = serializeComponent(component);
    });
  } else if (componentSource && typeof componentSource === 'object') {
    // Components might be stored as plain object
    for (const [name, component] of Object.entries(componentSource)) {
      components[name] = serializeComponent(component);
    }
  }

  // Get bounds safely
  let bounds: EntitySnapshot['bounds'] = null;
  try {
    if (e.view?.getBounds) {
      const b = e.view.getBounds();
      bounds = { x: b.x, y: b.y, width: b.width, height: b.height };
    }
  } catch {
    // Bounds calculation may fail for empty containers
  }

  return {
    id: e.UID ?? e.uid ?? 'unknown',
    type: e.constructor?.name ?? 'Entity',
    position: { x: e.position?.x ?? 0, y: e.position?.y ?? 0 },
    scale: { x: e.scale?.x ?? 1, y: e.scale?.y ?? 1 },
    rotation: e.rotation ?? 0,
    visible: e.visible ?? true,
    alpha: e.alpha ?? 1,
    bounds,
    components,
    childCount: e.view?.children?.length ?? 0,
  };
}

/**
 * Creates an ECS access layer for the test harness.
 *
 * The returned object provides methods to query entities and components
 * from the registered ODIE Scene2D. All data is serialized to plain objects
 * to ensure safe cross-context access from Playwright evaluate calls.
 *
 * @returns ECSAccessInternal instance with query methods and scene setter
 *
 * @example
 * // Internal usage in harness creation
 * const ecsAccess = createECSAccess();
 *
 * // Register scene when game initializes
 * ecsAccess._setScene(scene);
 *
 * // Query entities
 * const entities = ecsAccess.getEntities();
 * const playerEntities = ecsAccess.queryByComponent('player');
 */
export function createECSAccess(): ECSAccessInternal {
  let sceneRef: unknown = null;

  const getScene = (): unknown => sceneRef;

  const getEntities = (): EntitySnapshot[] => {
    if (!sceneRef) return [];

    // ODIE Scene2D has `allEntities.children` array containing all registered entities
    // allEntities is a Group class with a children array
    const scene = sceneRef as {
      allEntities?: {
        children?: unknown[];
        length?: number;
      };
    };

    if (!scene.allEntities) {
      return [];
    }

    // Group has a children array
    const entities = scene.allEntities.children ?? [];

    return entities.map((entity) => serializeEntity(entity));
  };

  const getEntity = (id: string): EntitySnapshot | null => {
    const entities = getEntities();
    // Compare as strings to handle both numeric and string IDs
    return entities.find((e) => String(e.id) === id) ?? null;
  };

  const queryByComponent = (componentName: string): EntitySnapshot[] => {
    const entities = getEntities();
    return entities.filter((e) => componentName in e.components);
  };

  return {
    getScene,
    getEntities,
    getEntity,
    queryByComponent,
    getEntityCount: (): number => getEntities().length,
    hasEntity: (id: string): boolean => getEntity(id) !== null,

    _setScene: (scene: unknown): void => {
      sceneRef = scene;
    },
  };
}
