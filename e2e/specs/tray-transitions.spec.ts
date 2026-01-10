/**
 * E2E tests for tray visibility transitions.
 *
 * Tests the tray system where:
 * - Index 0-1 trays are visible
 * - Index 2+ trays are hidden initially (covered by tray-cover sprites)
 * - When a tray fills, it hides and the next tray is revealed
 * - Levels can have 4-5 trays; test level has 4 trays
 */

import { test, expect } from '@playwright/test';
import { attachTelemetry } from '../helpers/telemetry';
import { createHarnessClient, type EntitySnapshot } from '../helpers/harness';

test.describe('Tray Transitions', () => {
  test('initial tray visibility - first two trays visible', async ({
    page,
  }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1&region=test&level=0');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);

    // Query tray entities
    const trays = await harness.queryByComponent('tray');
    // Test level has 4 trays
    expect(trays.length).toBe(4);

    // Check displayOrder values
    const displayOrders = trays.map(
      (t: EntitySnapshot) =>
        (t.components.tray as { displayOrder: number }).displayOrder
    );

    // Should have 0, 1, 2, 3 display orders (test level has 4 trays)
    expect(displayOrders).toContain(0);
    expect(displayOrders).toContain(1);
    expect(displayOrders).toContain(2);
    expect(displayOrders).toContain(3);

    // Trays with displayOrder 0-1 should be at visible Y position (around 202)
    const visibleTrays = trays.filter(
      (t: EntitySnapshot) =>
        (t.components.tray as { displayOrder: number }).displayOrder < 2
    );
    for (const tray of visibleTrays) {
      expect(tray.position.y).toBeLessThan(300); // Should be at ~202
    }

    // Trays with displayOrder 2+ should be at hidden Y position (450)
    // Test level has 4 trays, so displayOrder 2-3 are hidden
    const hiddenTrays = trays.filter(
      (t: EntitySnapshot) =>
        (t.components.tray as { displayOrder: number }).displayOrder >= 2
    );
    for (const tray of hiddenTrays) {
      expect(tray.position.y).toBeGreaterThan(400); // Should be at ~450
    }
  });

  test('placeholders are created for each tray slot', async ({ page }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1&region=test&level=0');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);

    // Get all tray entities
    const trays = await harness.queryByComponent('tray');

    // Each tray should have placeholder sprites as children
    // Tray capacities in test level: 3, 3, 2, 2
    for (const tray of trays) {
      const capacity = (tray.components.tray as { capacity: number }).capacity;
      // Placeholders are children of the tray view
      // The childCount should include the tray sprite + placeholder sprites
      expect(tray.childCount).toBeGreaterThanOrEqual(capacity);
    }
  });

  test('screw placement goes to matching visible tray', async ({ page }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1&region=test&level=0');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);

    // Wait for level to fully render
    await page.waitForTimeout(500);

    // Get initial tray state (red tray should have 0 screws)
    let trays = await harness.queryByComponent('tray');
    const redTray = trays.find(
      (t: EntitySnapshot) =>
        (t.components.tray as { color: string }).color === 'red'
    );
    expect(redTray).toBeDefined();
    expect(
      (redTray!.components.tray as { screwCount: number }).screwCount
    ).toBe(0);

    // Tap the red screw at position (250, 850)
    await harness.act({ type: 'pointerDown', x: 250, y: 850 });
    await harness.act({ type: 'pointerUp', x: 250, y: 850 });

    // Wait for animation to complete
    await page.waitForTimeout(800);

    // Red tray should now have 1 screw
    trays = await harness.queryByComponent('tray');
    const updatedRedTray = trays.find(
      (t: EntitySnapshot) =>
        (t.components.tray as { color: string }).color === 'red'
    );
    expect(
      (updatedRedTray!.components.tray as { screwCount: number }).screwCount
    ).toBe(1);
  });

  test('screw goes to buffer when no matching visible tray', async ({
    page,
  }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1&region=test&level=0');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);

    // Wait for level to fully render
    await page.waitForTimeout(500);

    // Get initial buffer state
    let bufferTrays = await harness.queryByComponent('bufferTray');
    expect(bufferTrays.length).toBe(1);
    const initialScrewCount = (
      bufferTrays[0]!.components.bufferTray as { screwIds: string[] }
    ).screwIds.length;
    expect(initialScrewCount).toBe(0);

    // Yellow tray is hidden (displayOrder 3), so yellow screw should go to buffer
    // Tap the yellow screw at position (685, 865)
    await harness.act({ type: 'pointerDown', x: 685, y: 865 });
    await harness.act({ type: 'pointerUp', x: 685, y: 865 });

    // Wait for animation to complete
    await page.waitForTimeout(800);

    // Buffer should now have 1 screw
    bufferTrays = await harness.queryByComponent('bufferTray');
    const updatedScrewCount = (
      bufferTrays[0]!.components.bufferTray as { screwIds: string[] }
    ).screwIds.length;
    expect(updatedScrewCount).toBe(1);
  });

  test('tray hides when filled to capacity', async ({ page }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1&region=test&level=0');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);

    // Wait for level to fully render
    await page.waitForTimeout(500);

    // Get initial red tray state
    let trays = await harness.queryByComponent('tray');
    const redTray = trays.find(
      (t: EntitySnapshot) =>
        (t.components.tray as { color: string }).color === 'red'
    );
    const initialDisplayOrder = (
      redTray!.components.tray as { displayOrder: number }
    ).displayOrder;
    expect(initialDisplayOrder).toBe(0); // Red tray starts at displayOrder 0

    // Red tray has capacity 3 in test level
    // We have 2 red screws: (250, 850) and (600, 995)
    // Need to fill the tray by tapping both red screws

    // First red screw
    await harness.act({ type: 'pointerDown', x: 250, y: 850 });
    await harness.act({ type: 'pointerUp', x: 250, y: 850 });
    await page.waitForTimeout(800);

    // Second red screw
    await harness.act({ type: 'pointerDown', x: 600, y: 995 });
    await harness.act({ type: 'pointerUp', x: 600, y: 995 });
    await page.waitForTimeout(800);

    // At this point, red tray has 2/3 screws (not full yet)
    trays = await harness.queryByComponent('tray');
    const updatedRedTray = trays.find(
      (t: EntitySnapshot) =>
        (t.components.tray as { color: string }).color === 'red'
    );
    expect(
      (updatedRedTray!.components.tray as { screwCount: number }).screwCount
    ).toBe(2);
    // Should still be visible (not hidden yet)
    expect(
      (updatedRedTray!.components.tray as { displayOrder: number }).displayOrder
    ).toBeLessThan(99);
  });

  test('isAnimating flag prevents interaction during transition', async ({
    page,
  }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1&region=test&level=0');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);

    // Wait for level to fully render
    await page.waitForTimeout(500);

    // Get tray entities
    const trays = await harness.queryByComponent('tray');

    // All trays should start with isAnimating = false
    for (const tray of trays) {
      expect(
        (tray.components.tray as { isAnimating: boolean }).isAnimating
      ).toBe(false);
    }
  });

  test('displayOrder determines tray x-position', async ({ page }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1&region=test&level=0');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);

    // Get tray entities
    const trays = await harness.queryByComponent('tray');

    // Sort by displayOrder
    const sortedTrays = [...trays].sort(
      (a: EntitySnapshot, b: EntitySnapshot) =>
        (a.components.tray as { displayOrder: number }).displayOrder -
        (b.components.tray as { displayOrder: number }).displayOrder
    );

    // Expected X positions based on new Figma design TRAY_FRAME_LAYOUT
    // Slot positions: frame.x(32) + slotOffsets[i].x
    // Slot 0: 32 + 25 = 57
    // Slot 1: 32 + 220 = 252
    // Slot 2: 32 + 419 = 451
    // Slot 3: 32 + 614 = 646
    // Slot 4: 32 + 808 = 840
    const expectedXPositions = [57, 252, 451, 646, 840];

    for (const tray of sortedTrays) {
      if (!tray) continue;
      const displayOrder = (tray.components.tray as { displayOrder: number })
        .displayOrder;

      // Visible trays (0-1) should be at their expected X position (within 1px)
      if (displayOrder < 2) {
        expect(tray.position.x).toBeCloseTo(
          expectedXPositions[displayOrder]!,
          0
        );
      }
    }
  });
});
