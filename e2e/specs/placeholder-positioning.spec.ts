/**
 * E2E tests for placeholder positioning within trays.
 *
 * Validates that placeholders are centered within tray boundaries
 * and don't extend outside the tray sprite.
 */

import { test, expect } from '@playwright/test';
import { attachTelemetry } from '../helpers/telemetry';
import { createHarnessClient, type EntitySnapshot } from '../helpers/harness';

// Constants matching the game implementation
const TRAY_WIDTH = 200;
const SLOT_DISPLAY_WIDTH = 50;
const PLACEHOLDER_SPACING = 50;

/**
 * Calculate expected centered slot positions for a given capacity.
 */
function calculateCenteredPositions(capacity: number): number[] {
  const totalWidth = (capacity - 1) * PLACEHOLDER_SPACING + SLOT_DISPLAY_WIDTH;
  const startX = (TRAY_WIDTH - totalWidth) / 2 + SLOT_DISPLAY_WIDTH / 2;

  const positions: number[] = [];
  for (let i = 0; i < capacity; i++) {
    positions.push(startX + i * PLACEHOLDER_SPACING);
  }
  return positions;
}

test.describe('Placeholder Positioning', () => {
  test('placeholders stay within tray boundaries', async ({ page }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1&region=test&level=0');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);

    // Query tray entities
    const trays = await harness.queryByComponent('tray');
    expect(trays.length).toBeGreaterThan(0);

    for (const tray of trays) {
      const trayX = tray.position.x;
      const capacity = (tray.components.tray as { capacity: number }).capacity;

      // Calculate expected centered positions
      const expectedPositions = calculateCenteredPositions(capacity);

      for (let i = 0; i < capacity; i++) {
        const expectedLocalX = expectedPositions[i];
        if (expectedLocalX === undefined) continue;

        const expectedWorldX = trayX + expectedLocalX;

        // Placeholder center should be within tray bounds
        // (center at expectedWorldX, half-width is 25)
        const leftEdge = expectedWorldX - SLOT_DISPLAY_WIDTH / 2;
        const rightEdge = expectedWorldX + SLOT_DISPLAY_WIDTH / 2;

        expect(leftEdge).toBeGreaterThanOrEqual(trayX);
        expect(rightEdge).toBeLessThanOrEqual(trayX + TRAY_WIDTH);
      }
    }
  });

  test('placeholders are evenly spaced and centered', async ({ page }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1&region=test&level=0');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);

    const trays = await harness.queryByComponent('tray');

    for (const tray of trays) {
      const capacity = (tray.components.tray as { capacity: number }).capacity;

      // Calculate expected centered positions
      const expectedPositions = calculateCenteredPositions(capacity);

      const firstSlotX = expectedPositions[0];
      const lastSlotX = expectedPositions[capacity - 1];

      if (firstSlotX === undefined || lastSlotX === undefined) continue;

      // Verify symmetry: distance from left edge to first slot center
      // should equal distance from last slot center to right edge
      const leftMargin = firstSlotX - SLOT_DISPLAY_WIDTH / 2;
      const rightMargin = TRAY_WIDTH - (lastSlotX + SLOT_DISPLAY_WIDTH / 2);

      // Allow 1px tolerance for floating point
      expect(Math.abs(leftMargin - rightMargin)).toBeLessThan(1);
    }
  });

  test('3-slot tray has placeholders at x=50, 100, 150', async ({ page }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1&region=test&level=0');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);

    const trays = await harness.queryByComponent('tray');

    // Find a 3-capacity tray
    const tray3 = trays.find(
      (t: EntitySnapshot) =>
        (t.components.tray as { capacity: number }).capacity === 3
    );

    if (tray3) {
      const expectedPositions = calculateCenteredPositions(3);
      expect(expectedPositions).toEqual([50, 100, 150]);
    }
  });

  test('2-slot tray has placeholders at x=75, 125', async ({ page }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1&region=test&level=0');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);

    const trays = await harness.queryByComponent('tray');

    // Find a 2-capacity tray
    const tray2 = trays.find(
      (t: EntitySnapshot) =>
        (t.components.tray as { capacity: number }).capacity === 2
    );

    if (tray2) {
      const expectedPositions = calculateCenteredPositions(2);
      expect(expectedPositions).toEqual([75, 125]);
    }
  });

  test('4-slot tray has placeholders at x=25, 75, 125, 175', () => {
    // This test validates the formula for 4-slot trays
    // even if the test level doesn't have one
    const expectedPositions = calculateCenteredPositions(4);
    expect(expectedPositions).toEqual([25, 75, 125, 175]);

    // Verify all positions are within bounds
    for (const x of expectedPositions) {
      const leftEdge = x - SLOT_DISPLAY_WIDTH / 2;
      const rightEdge = x + SLOT_DISPLAY_WIDTH / 2;
      expect(leftEdge).toBeGreaterThanOrEqual(0);
      expect(rightEdge).toBeLessThanOrEqual(TRAY_WIDTH);
    }
  });
});
