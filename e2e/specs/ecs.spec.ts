import { test, expect } from '@playwright/test';
import { withHarness } from '../helpers/harness';
import { attachTelemetry, printTelemetry } from '../helpers/telemetry';
import {
  expectEntitiesWithComponent,
  expectComponent,
  expectNoCriticalErrors,
} from '../helpers/assertions';

test.describe('ECS Access', () => {
  test('can query entities after boot', async ({ page }) => {
    const telemetry = attachTelemetry(page);
    await page.goto('/?testMode=1');

    const harness = withHarness(page);
    await harness.waitForReady();

    const entities = await harness.getEntities();
    printTelemetry(telemetry);

    expect(entities.length).toBeGreaterThan(0);
  });

  test('can get entity count', async ({ page }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1');

    const harness = withHarness(page);
    await harness.waitForReady();

    const count = await harness.getEntityCount();

    // Should have at least the red square entity
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('can query entities by component', async ({ page }) => {
    const telemetry = attachTelemetry(page);
    await page.goto('/?testMode=1');

    const harness = withHarness(page);
    await harness.waitForReady();

    // Query for TestSquareComponent - we have 2 squares (interactive + rotating)
    const squares = await harness.queryByComponent('testSquare');
    printTelemetry(telemetry);

    expect(squares.length).toBe(2);

    // Find the interactive square (without rotation component)
    const interactiveSquare = squares.find(
      (s) => !('rotation' in s.components)
    );
    expect(interactiveSquare).toBeDefined();

    // Verify component data
    expectComponent(interactiveSquare!, 'testSquare', {
      size: 100,
      color: 0xff0000,
    });
  });

  test('entity has correct position data', async ({ page }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1');

    const harness = withHarness(page);
    await harness.waitForReady();

    const squares = await harness.queryByComponent('testSquare');
    expect(squares.length).toBe(2);

    // Find the interactive square (without rotation component)
    const square = squares.find((s) => !('rotation' in s.components));
    expect(square).toBeDefined();

    // Red square is positioned at center: (1024/2 - 50, 768/2 - 50)
    expect(square!.position.x).toBeCloseTo(512 - 50, 0);
    expect(square!.position.y).toBeCloseTo(384 - 50, 0);
  });

  test('entity snapshot contains expected properties', async ({ page }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1');

    const harness = withHarness(page);
    await harness.waitForReady();

    const entities = await harness.getEntities();
    expect(entities.length).toBeGreaterThan(0);

    const entity = entities[0]!;

    // Check snapshot structure
    expect(entity).toHaveProperty('id');
    expect(entity).toHaveProperty('type');
    expect(entity).toHaveProperty('position');
    expect(entity).toHaveProperty('scale');
    expect(entity).toHaveProperty('rotation');
    expect(entity).toHaveProperty('visible');
    expect(entity).toHaveProperty('alpha');
    expect(entity).toHaveProperty('components');
    expect(entity).toHaveProperty('childCount');

    // Check position structure
    expect(entity.position).toHaveProperty('x');
    expect(entity.position).toHaveProperty('y');

    // Check scale structure
    expect(entity.scale).toHaveProperty('x');
    expect(entity.scale).toHaveProperty('y');
  });

  test('can check entity existence', async ({ page }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1');

    const harness = withHarness(page);
    await harness.waitForReady();

    const entities = await harness.getEntities();
    expect(entities.length).toBeGreaterThan(0);

    const firstEntity = entities[0]!;
    const firstEntityId = String(firstEntity.id);

    // Check existing entity
    const exists = await harness.hasEntity(firstEntityId);
    expect(exists).toBe(true);

    // Check non-existing entity
    const notExists = await harness.hasEntity('non-existent-id');
    expect(notExists).toBe(false);
  });

  test('can get entity by ID', async ({ page }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1');

    const harness = withHarness(page);
    await harness.waitForReady();

    const entities = await harness.getEntities();
    expect(entities.length).toBeGreaterThan(0);

    const firstEntity = entities[0]!;
    const firstEntityId = String(firstEntity.id);

    // Get existing entity
    const entity = await harness.getEntity(firstEntityId);
    expect(entity).not.toBeNull();
    if (entity) {
      // Compare as strings since entity.id could be number or string
      expect(String(entity.id)).toBe(firstEntityId);
    }

    // Get non-existing entity
    const notFound = await harness.getEntity('non-existent-id');
    expect(notFound).toBeNull();
  });

  test('harness reports no critical errors', async ({ page }) => {
    const telemetry = attachTelemetry(page);
    await page.goto('/?testMode=1');

    const harness = withHarness(page);
    await harness.waitForReady();

    const errors = await harness.getErrors();
    printTelemetry(telemetry);

    // Allow known non-critical errors
    expectNoCriticalErrors(errors, ['Failed to load test image']);
  });

  test('render signature contains entities', async ({ page }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1');

    const harness = withHarness(page);
    await harness.waitForReady();

    const signature = await harness.getRenderSignature();

    // Verify entities with testSquare component exist (2 squares: interactive + rotating)
    expectEntitiesWithComponent(signature, 'testSquare', 2);
  });
});
