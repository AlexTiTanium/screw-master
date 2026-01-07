import { expect } from '@playwright/test';
import type { RenderSignature, EntitySnapshot } from './harness';

/**
 * Assert that the render signature has a specific entity count
 */
export function expectEntityCount(
  signature: RenderSignature,
  count: number
): void {
  expect(signature.entityCount).toBe(count);
}

/**
 * Assert that an entity exists in the render signature
 */
export function expectEntityExists(
  signature: RenderSignature,
  entityId: string
): void {
  const entity = signature.entities.find((e) => e.id === entityId);
  expect(entity, `Entity ${entityId} should exist`).toBeDefined();
}

/**
 * Assert that an entity does NOT exist in the render signature
 */
export function expectEntityNotExists(
  signature: RenderSignature,
  entityId: string
): void {
  const entity = signature.entities.find((e) => e.id === entityId);
  expect(entity, `Entity ${entityId} should not exist`).toBeUndefined();
}

/**
 * Assert that an entity is at a specific position (with optional tolerance)
 */
export function expectEntityPosition(
  signature: RenderSignature,
  entityId: string,
  x: number,
  y: number,
  tolerance = 0.01
): void {
  const entity = signature.entities.find((e) => e.id === entityId);
  expect(entity, `Entity ${entityId} should exist`).toBeDefined();
  if (entity) {
    expect(entity.position.x).toBeCloseTo(x, -Math.log10(tolerance));
    expect(entity.position.y).toBeCloseTo(y, -Math.log10(tolerance));
  }
}

/**
 * Assert that an entity has expected visibility
 */
export function expectEntityVisible(
  signature: RenderSignature,
  entityId: string,
  visible: boolean
): void {
  const entity = signature.entities.find((e) => e.id === entityId);
  expect(entity, `Entity ${entityId} should exist`).toBeDefined();
  if (entity) {
    expect(entity.visible).toBe(visible);
  }
}

/**
 * Assert that an entity has a specific component with expected data
 */
export function expectComponent(
  entity: EntitySnapshot,
  componentName: string,
  expectedData?: Record<string, unknown>
): void {
  expect(
    entity.components[componentName],
    `Component ${componentName} should exist`
  ).toBeDefined();

  if (expectedData) {
    expect(entity.components[componentName]).toMatchObject(expectedData);
  }
}

/**
 * Assert that an entity has a component by name
 */
export function expectHasComponent(
  entity: EntitySnapshot,
  componentName: string
): void {
  expect(
    componentName in entity.components,
    `Entity should have component ${componentName}`
  ).toBe(true);
}

/**
 * Assert that two render signatures have the same hash (stable state)
 */
export function expectSignatureStable(
  sig1: RenderSignature,
  sig2: RenderSignature
): void {
  expect(sig1.hash, 'Signatures should have the same hash (stable state)').toBe(
    sig2.hash
  );
}

/**
 * Assert that two render signatures have different hashes (state changed)
 */
export function expectSignatureChanged(
  sig1: RenderSignature,
  sig2: RenderSignature
): void {
  expect(
    sig1.hash,
    'Signatures should have different hashes (state changed)'
  ).not.toBe(sig2.hash);
}

/**
 * Assert that the scene is in a specific state
 */
export function expectSceneState(
  signature: RenderSignature,
  state: 'running' | 'paused' | 'stopped'
): void {
  expect(signature.sceneState).toBe(state);
}

/**
 * Assert that at least one entity exists with the given component
 */
export function expectEntitiesWithComponent(
  signature: RenderSignature,
  componentName: string,
  minCount = 1
): EntitySnapshot[] {
  const entities = signature.entities.filter(
    (e) => componentName in e.components
  );
  expect(
    entities.length,
    `Should have at least ${String(minCount)} entity with component ${componentName}`
  ).toBeGreaterThanOrEqual(minCount);
  return entities;
}

/**
 * Assert no errors in the render signature check
 * (This is a helper for combining with harness.getErrors())
 */
export function expectNoErrors(errors: string[]): void {
  expect(errors, 'Should have no errors').toHaveLength(0);
}

/**
 * Filter errors and assert no critical errors remain
 */
export function expectNoCriticalErrors(
  errors: string[],
  allowedPatterns: (string | RegExp)[] = []
): void {
  const criticalErrors = errors.filter((error) => {
    return !allowedPatterns.some((pattern) => {
      if (typeof pattern === 'string') {
        return error.includes(pattern);
      }
      return pattern.test(error);
    });
  });

  expect(
    criticalErrors,
    `Should have no critical errors, but found: ${criticalErrors.join(', ')}`
  ).toHaveLength(0);
}

/**
 * Assert that entity count is within a range
 */
export function expectEntityCountRange(
  signature: RenderSignature,
  min: number,
  max: number
): void {
  expect(
    signature.entityCount,
    `Entity count should be between ${String(min)} and ${String(max)}`
  ).toBeGreaterThanOrEqual(min);
  expect(
    signature.entityCount,
    `Entity count should be between ${String(min)} and ${String(max)}`
  ).toBeLessThanOrEqual(max);
}

/**
 * Assert that a component has specific data shape (keys exist)
 */
export function expectComponentDataShape(
  entity: EntitySnapshot,
  componentName: string,
  expectedKeys: string[]
): void {
  expect(
    entity.components[componentName],
    `Component ${componentName} should exist`
  ).toBeDefined();

  const component = entity.components[componentName] as Record<string, unknown>;
  for (const key of expectedKeys) {
    expect(
      key in component,
      `Component ${componentName} should have key ${key}`
    ).toBe(true);
  }
}

/**
 * Assert that an action was successful
 */
export function expectActionSuccess(
  result: { success: boolean; error?: string },
  actionDescription?: string
): void {
  expect(
    result.success,
    actionDescription
      ? `Action "${actionDescription}" should succeed: ${result.error ?? 'unknown error'}`
      : `Action should succeed: ${result.error ?? 'unknown error'}`
  ).toBe(true);
}
