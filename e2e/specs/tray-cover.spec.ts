/**
 * E2E tests for tray cover visibility.
 *
 * Tests that when there is no tray in a slot position,
 * it is visually covered by tray-cover.png.
 */

import { test, expect } from '@playwright/test';
import { attachTelemetry } from '../helpers/telemetry';
import { createHarnessClient, type EntitySnapshot } from '../helpers/harness';

// Expected tray X positions (from new Figma design)
// Slot positions: frame.x(32) + slotOffsets[i].x
// Slot 0: 32 + 25 = 57
// Slot 1: 32 + 220 = 252
// Slot 2: 32 + 419 = 451
// Slot 3: 32 + 614 = 646
// Slot 4: 32 + 808 = 840
const EXPECTED_TRAY_X_POSITIONS = [57, 252, 451, 646, 840];

test.describe('Tray Cover', () => {
  test('displayOrder 2 tray is at hidden Y position initially', async ({
    page,
  }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1&region=test&level=0');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);

    const trays = await harness.queryByComponent('tray');

    // Find tray with displayOrder 2
    const hiddenTray = trays.find(
      (t: EntitySnapshot) =>
        (t.components.tray as { displayOrder: number }).displayOrder === 2
    );

    expect(hiddenTray).toBeDefined();
    // Hidden trays should be at Y: 450 (TRAY_HIDDEN_Y)
    expect(hiddenTray!.position.y).toBeGreaterThan(400);
  });

  test('displayOrder 3 tray is at hidden Y position initially', async ({
    page,
  }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1&region=test&level=0');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);

    const trays = await harness.queryByComponent('tray');

    // Find tray with displayOrder 3
    const hiddenTray = trays.find(
      (t: EntitySnapshot) =>
        (t.components.tray as { displayOrder: number }).displayOrder === 3
    );

    expect(hiddenTray).toBeDefined();
    // Hidden trays should be at Y: 450 (TRAY_HIDDEN_Y)
    expect(hiddenTray!.position.y).toBeGreaterThan(400);
  });

  // Note: displayOrder 4 test skipped - test level only has 4 trays (displayOrder 0-3)

  test('visible trays are at normal Y position', async ({ page }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1&region=test&level=0');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);

    const trays = await harness.queryByComponent('tray');

    // Verify visible trays (displayOrder 0-1) are at normal Y
    const visibleTrays = trays.filter(
      (t: EntitySnapshot) =>
        (t.components.tray as { displayOrder: number }).displayOrder < 2
    );

    expect(visibleTrays.length).toBe(2);

    for (const tray of visibleTrays) {
      // Should be at ~202, definitely less than 250
      expect(tray.position.y).toBeLessThan(250);
      // And greater than 150 (not at 0)
      expect(tray.position.y).toBeGreaterThan(150);
    }
  });

  test('hidden trays are below visible area', async ({ page }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1&region=test&level=0');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);

    const trays = await harness.queryByComponent('tray');

    // Verify hidden trays (displayOrder 2+) are at hidden Y
    // Test level has 4 trays: 2 visible, 2 hidden
    const hiddenTrays = trays.filter(
      (t: EntitySnapshot) =>
        (t.components.tray as { displayOrder: number }).displayOrder >= 2
    );

    expect(hiddenTrays.length).toBe(2);

    for (const tray of hiddenTrays) {
      // Should be at ~450, hidden below visible area
      expect(tray.position.y).toBeGreaterThan(400);
    }
  });

  test('test level has 4 trays total', async ({ page }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1&region=test&level=0');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);

    const trays = await harness.queryByComponent('tray');
    expect(trays.length).toBe(4);

    // Count visible vs hidden by Y position
    const visibleByPosition = trays.filter(
      (t: EntitySnapshot) => t.position.y < 300
    );
    const hiddenByPosition = trays.filter(
      (t: EntitySnapshot) => t.position.y > 400
    );

    expect(visibleByPosition.length).toBe(2);
    expect(hiddenByPosition.length).toBe(2);
  });

  test('visible trays are at expected X positions', async ({ page }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1&region=test&level=0');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);

    const trays = await harness.queryByComponent('tray');

    // Find visible trays and check their X positions
    const tray0 = trays.find(
      (t: EntitySnapshot) =>
        (t.components.tray as { displayOrder: number }).displayOrder === 0
    );
    const tray1 = trays.find(
      (t: EntitySnapshot) =>
        (t.components.tray as { displayOrder: number }).displayOrder === 1
    );

    expect(tray0).toBeDefined();
    expect(tray1).toBeDefined();

    // displayOrder 0 should be at X ~39.5
    expect(tray0!.position.x).toBeCloseTo(EXPECTED_TRAY_X_POSITIONS[0]!, 0);
    // displayOrder 1 should be at X ~239.5
    expect(tray1!.position.x).toBeCloseTo(EXPECTED_TRAY_X_POSITIONS[1]!, 0);
  });
});
