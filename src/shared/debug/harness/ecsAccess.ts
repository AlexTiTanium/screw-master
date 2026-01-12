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
 * Checks if a property should be skipped during serialization.
 *
 * @param key - Property key
 * @param value - Property value
 * @returns True if the property should be skipped
 *
 * @example
 * shouldSkipProperty('_internal', {}); // true
 */
/** Properties to skip entirely during component serialization */
const SKIP_PROPERTIES = new Set([
  'constructor',
  'entity', // Circular ref: component → entity (not needed, entity ID is in parent)
  'scene', // Circular ref to scene
  'parent', // Circular ref to parent container
  'children', // Can be huge and redundant with display tree
]);

/** Properties to convert to UID references */
const UID_REF_PROPERTIES = new Set([
  'view', // Convert view (display object) to viewUid reference
]);

function shouldSkipProperty(key: string, value: unknown): boolean {
  return (
    typeof value === 'function' ||
    key.startsWith('_') ||
    SKIP_PROPERTIES.has(key)
  );
}

/**
 * Extracts serializable value from a property.
 * @param v - The value to extract
 * @param depth - Current recursion depth
 * @returns Object with include flag and extracted value
 */
function extractPropertyValue(
  v: unknown,
  depth: number
): { include: boolean; value: unknown } {
  if (v === null || v === undefined) return { include: true, value: v };
  if (typeof v !== 'object') return { include: true, value: v };
  if (Array.isArray(v) && (v.length === 0 || typeof v[0] !== 'object')) {
    return { include: true, value: v };
  }
  if (!Array.isArray(v)) {
    const nested = serializeObjectValue(v, depth + 1);
    if (nested !== '[max depth]') return { include: true, value: nested };
  }
  return { include: false, value: null };
}

/**
 * Serializes an object value with fallback handling.
 * For complex objects that can't be directly serialized, extracts primitive values.
 *
 * @param value - The object to serialize
 * @param depth - Current recursion depth (max 3)
 * @returns Serialized representation of the value
 *
 * @example
 * serializeObjectValue({ x: 1, y: 2 }); // { x: 1, y: 2 }
 */
function serializeObjectValue(value: unknown, depth = 0): unknown {
  if (depth > 3) return '[max depth]';

  // Try direct JSON serialization first
  try {
    return JSON.parse(JSON.stringify(value)) as unknown;
  } catch {
    // Fall through to manual extraction
  }

  if (typeof value !== 'object' || value === null) return value;

  const obj = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const key of Object.keys(obj)) {
    if (shouldSkipProperty(key, obj[key])) continue;
    const { include, value: v } = extractPropertyValue(obj[key], depth);
    if (include) result[key] = v;
  }

  return Object.keys(result).length > 0 ? result : '[complex object]';
}

/**
 * Extracts UID from a display object if available.
 * @param obj - The object to extract UID from
 * @returns The UID string or null
 */
function extractUid(obj: unknown): string | null {
  if (obj && typeof obj === 'object') {
    const o = obj as Record<string, unknown>;
    const uid = o.uid ?? o.UID;
    if (typeof uid === 'string') return uid;
    if (typeof uid === 'number') return uid.toString();
  }
  return null;
}

/**
 * Serializes a component instance to a plain object.
 *
 * @param component - The component instance to serialize
 * @returns Plain object with component data
 *
 * @example
 * serializeComponent({ health: 100, _internal: {} }); // { health: 100 }
 */
function serializeComponent(component: unknown): unknown {
  if (component === null || component === undefined) {
    return null;
  }

  const result: Record<string, unknown> = {};
  const comp = component as Record<string, unknown>;

  for (const key of Object.keys(comp)) {
    const value = comp[key];
    if (shouldSkipProperty(key, value)) {
      continue;
    }
    // Convert view to viewUid reference
    if (UID_REF_PROPERTIES.has(key)) {
      const uid = extractUid(value);
      if (uid !== null) {
        result[`${key}Uid`] = uid;
      }
      continue;
    }
    if (value === null || typeof value !== 'object') {
      result[key] = value;
    } else if (Array.isArray(value)) {
      result[key] = value;
    } else {
      result[key] = serializeObjectValue(value);
    }
  }

  return result;
}

/** Entity shape for type casting. */
interface EntityShape {
  UID?: string;
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
  c?: Map<string, unknown> | Record<string, unknown>;
  components?: Map<string, unknown> | Record<string, unknown>;
}

/**
 * Extracts and serializes components from an entity.
 *
 * @param e - The entity shape
 * @returns Serialized components object
 *
 * @example
 * const components = extractComponents(entity);
 */
function extractComponents(e: EntityShape): Record<string, unknown> {
  const components: Record<string, unknown> = {};
  const source = e.c ?? e.components;
  if (source instanceof Map) {
    source.forEach((c, name) => {
      components[name] = serializeComponent(c);
    });
  } else if (source && typeof source === 'object') {
    for (const [name, c] of Object.entries(source)) {
      components[name] = serializeComponent(c);
    }
  }
  return components;
}

/**
 * Gets the bounds of an entity's view safely.
 *
 * @param e - The entity shape
 * @returns Bounds object or null
 *
 * @example
 * const bounds = getEntityBounds(entity);
 */
function getEntityBounds(e: EntityShape): EntitySnapshot['bounds'] {
  try {
    if (e.view?.getBounds) {
      const b = e.view.getBounds();
      return { x: b.x, y: b.y, width: b.width, height: b.height };
    }
  } catch {
    // Bounds calculation may fail
  }
  return null;
}

/**
 * Serializes an ODIE Entity2D to an EntitySnapshot.
 *
 * @param entity - The ODIE entity to serialize
 * @returns EntitySnapshot with serialized entity state
 *
 * @example
 * const snapshot = serializeEntity(entity);
 */
function serializeEntity(entity: unknown): EntitySnapshot {
  const e = entity as EntityShape;
  return {
    id: e.UID ?? e.uid ?? 'unknown',
    type: e.constructor?.name ?? 'Entity',
    position: { x: e.position?.x ?? 0, y: e.position?.y ?? 0 },
    scale: { x: e.scale?.x ?? 1, y: e.scale?.y ?? 1 },
    rotation: e.rotation ?? 0,
    visible: e.visible ?? true,
    alpha: e.alpha ?? 1,
    bounds: getEntityBounds(e),
    components: extractComponents(e),
    childCount: e.view?.children?.length ?? 0,
  };
}

/**
 * Gets all entities from a scene reference.
 *
 * @param sceneRef - The scene reference
 * @returns Array of serialized entity snapshots
 *
 * @example
 * const entities = getAllEntities(sceneRef);
 */
function getAllEntities(sceneRef: unknown): EntitySnapshot[] {
  if (!sceneRef) {
    return [];
  }
  const scene = sceneRef as { allEntities?: { children?: unknown[] } };
  const entities = scene.allEntities?.children ?? [];
  return entities.map((entity) => serializeEntity(entity));
}

/**
 * Extracts system names from a Scene2D reference.
 *
 * ODIE Scene2D stores systems in an internal map. This function
 * attempts to extract system names via the NAME static property.
 *
 * @param sceneRef - The scene reference
 * @returns Array of system names, or empty array if unavailable
 *
 * @example
 * const systems = getSystemNames(sceneRef);
 * // Returns: ['screwPlacement', 'animation', 'screwInteraction', ...]
 */
function getSystemNames(sceneRef: unknown): string[] {
  if (!sceneRef) {
    return [];
  }

  // ODIE Scene2D has a systems Map<string, System>
  const scene = sceneRef as { systems?: Map<string, unknown> };
  if (!scene.systems || !(scene.systems instanceof Map)) {
    return [];
  }

  // The Map keys are the system names
  return Array.from(scene.systems.keys());
}

/**
 * Creates an ECS access layer for the test harness.
 *
 * @returns ECSAccessInternal instance with query methods and scene setter
 *
 * @example
 * const ecsAccess = createECSAccess();
 * ecsAccess._setScene(scene);
 * const entities = ecsAccess.getEntities();
 */
export function createECSAccess(): ECSAccessInternal {
  let sceneRef: unknown = null;

  const getEntities = (): EntitySnapshot[] => getAllEntities(sceneRef);

  const getEntity = (id: string): EntitySnapshot | null =>
    getEntities().find((e) => String(e.id) === id) ?? null;

  return {
    getScene: (): unknown => sceneRef,
    getEntities,
    getEntity,
    queryByComponent: (name: string): EntitySnapshot[] =>
      getEntities().filter((e) => name in e.components),
    getEntityCount: (): number => getEntities().length,
    hasEntity: (id: string): boolean => getEntity(id) !== null,
    getSystems: (): string[] => getSystemNames(sceneRef),
    _setScene: (scene: unknown): void => {
      sceneRef = scene;
    },
  };
}
