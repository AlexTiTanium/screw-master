/**
 * E2E tests for level loading.
 *
 * Tests entity creation, positioning, and level configuration.
 */

import { test, expect } from '@playwright/test';
import {
  attachTelemetry,
  printTelemetry,
  getErrors,
  getWarnings,
} from '../helpers/telemetry';
import { createHarnessClient } from '../helpers/harness';
import { filterByComponent } from '../helpers/entityFilters';

test.describe('Level Loading', () => {
  test('test level loads without errors', async ({ page }) => {
    const telemetry = attachTelemetry(page);

    await page.goto('/?testMode=1&region=test&level=0');

    await page.waitForFunction(
      () =>
        (window as unknown as { __gameTest?: { ready: boolean } }).__gameTest
          ?.ready === true,
      { timeout: 15000 }
    );

    printTelemetry(telemetry);

    const errors = getErrors(telemetry);
    const criticalErrors = errors.filter(
      (e) => !e.includes('Failed to load test image')
    );
    expect(criticalErrors).toHaveLength(0);

    const harness = createHarnessClient(page);
    const harnessErrors = await harness.getErrors();
    expect(harnessErrors).toHaveLength(0);
  });

  test('creates correct entity counts', async ({ page }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1&region=test&level=0');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);

    const entities = await harness.getEntities();

    // Test level: 4 parts, 11 screws, 4 trays
    const partEntities = filterByComponent(entities, 'part');
    const screwEntities = filterByComponent(entities, 'screw');
    const trayEntities = filterByComponent(entities, 'tray');

    expect(partEntities).toHaveLength(4);
    expect(screwEntities).toHaveLength(11);
    expect(trayEntities).toHaveLength(4);
  });

  test('screws have correct colors', async ({ page }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1&region=test&level=0');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);

    const entities = await harness.getEntities();
    const screwEntities = filterByComponent(entities, 'screw');

    const colorCounts = new Map<string, number>();
    for (const screw of screwEntities) {
      const component = screw.components.screw as { color: string };
      const color = component.color;
      colorCounts.set(color, (colorCounts.get(color) ?? 0) + 1);
    }

    // Test level: 3 red, 3 blue, 3 green, 2 yellow
    expect(colorCounts.get('red')).toBe(3);
    expect(colorCounts.get('blue')).toBe(3);
    expect(colorCounts.get('green')).toBe(3);
    expect(colorCounts.get('yellow')).toBe(2);
  });

  test('screws are positioned correctly relative to boards', async ({
    page,
  }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1&region=test&level=0');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);

    const entities = await harness.getEntities();
    const screwEntities = filterByComponent(entities, 'screw');

    const redScrews = screwEntities.filter((e) => {
      const component = e.components.screw as { color: string };
      return component.color === 'red';
    });

    expect(redScrews.length).toBeGreaterThanOrEqual(1);

    // Expected positions for red screws (centered coordinate system)
    const expectedPositions = [
      { x: 315, y: 1289 }, // Board 1
      { x: 595, y: 1434 }, // Board 2
      { x: 400, y: 1169 }, // Board 3
    ];

    const positionMatches = redScrews.filter((screw) => {
      return expectedPositions.some(
        (expected) =>
          Math.abs(screw.position.x - expected.x) < 2 &&
          Math.abs(screw.position.y - expected.y) < 2
      );
    });

    expect(positionMatches.length).toBeGreaterThanOrEqual(1);
  });

  test('part entities have correct layer values', async ({ page }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1&region=test&level=0');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);

    const entities = await harness.getEntities();
    const partEntities = filterByComponent(entities, 'part');

    const layers = partEntities.map((e) => {
      const component = e.components.part as { layer: number };
      return component.layer;
    });

    // Test level: boards at layers 1, 1, 1, 2
    expect(layers.sort((a, b) => a - b)).toEqual([1, 1, 1, 2]);
  });

  test('level restart does not produce asset warnings', async ({ page }) => {
    const telemetry = attachTelemetry(page);
    await page.goto('/?testMode=1&region=test&level=0');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);

    // Count PixiJS warnings before restart
    const initialWarnings = getWarnings(telemetry);
    const pixiWarningsBefore = initialWarnings.filter((w) =>
      w.includes('PixiJS Warning')
    );

    // Click restart button at (78, 170)
    await harness.act({ type: 'pointerDown', x: 78, y: 170 });
    await harness.act({ type: 'pointerUp', x: 78, y: 170 });

    await page.waitForTimeout(1000);

    // Check for new PixiJS warnings
    const allWarnings = getWarnings(telemetry);
    const pixiWarningsAfter = allWarnings.filter((w) =>
      w.includes('PixiJS Warning')
    );

    const newWarnings = pixiWarningsAfter.slice(pixiWarningsBefore.length);
    const overwriteWarnings = newWarnings.filter((w) =>
      w.includes('overwriting')
    );

    expect(overwriteWarnings).toHaveLength(0);

    // Verify level reloaded correctly
    const errors = getErrors(telemetry);
    expect(errors).toHaveLength(0);

    const entities = await harness.getEntities();
    const screwEntities = filterByComponent(entities, 'screw');
    expect(screwEntities).toHaveLength(11);
  });
});
