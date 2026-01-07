import type { EntitySnapshot } from './harness';

/**
 * Entity filter helpers for E2E tests.
 *
 * These functions reduce repetitive filtering patterns across test files.
 */

/**
 * Filter entities that have a specific component
 */
export function filterByComponent(
  entities: EntitySnapshot[],
  componentName: string
): EntitySnapshot[] {
  return entities.filter((e) => componentName in e.components);
}

/**
 * Filter entities that do NOT have a specific component
 */
export function filterWithoutComponent(
  entities: EntitySnapshot[],
  componentName: string
): EntitySnapshot[] {
  return entities.filter((e) => !(componentName in e.components));
}

/**
 * Filter entities that have all specified components
 */
export function filterByComponents(
  entities: EntitySnapshot[],
  componentNames: string[]
): EntitySnapshot[] {
  return entities.filter((e) =>
    componentNames.every((name) => name in e.components)
  );
}

/**
 * Filter square entities that are interactive (have testSquare but no rotation)
 */
export function filterInteractiveSquares(
  entities: EntitySnapshot[]
): EntitySnapshot[] {
  return entities.filter(
    (e) => 'testSquare' in e.components && !('rotation' in e.components)
  );
}

/**
 * Filter square entities that are rotating (have both testSquare and rotation)
 */
export function filterRotatingSquares(
  entities: EntitySnapshot[]
): EntitySnapshot[] {
  return entities.filter(
    (e) => 'testSquare' in e.components && 'rotation' in e.components
  );
}

/**
 * Filter sprite entities
 */
export function filterSprites(entities: EntitySnapshot[]): EntitySnapshot[] {
  return entities.filter((e) => 'testSprite' in e.components);
}

/**
 * Filter entities within a bounding box
 */
export function filterWithinBounds(
  entities: EntitySnapshot[],
  bounds: { x: number; y: number; width: number; height: number }
): EntitySnapshot[] {
  return entities.filter((e) => {
    const pos = e.position;
    return (
      pos.x >= bounds.x &&
      pos.x <= bounds.x + bounds.width &&
      pos.y >= bounds.y &&
      pos.y <= bounds.y + bounds.height
    );
  });
}

/**
 * Find an entity by component data match
 */
export function findByComponentData<T extends Record<string, unknown>>(
  entities: EntitySnapshot[],
  componentName: string,
  matcher: Partial<T>
): EntitySnapshot | undefined {
  return entities.find((e) => {
    const component = e.components[componentName] as T | undefined;
    if (!component) return false;

    return Object.entries(matcher).every(
      ([key, value]) => component[key] === value
    );
  });
}
