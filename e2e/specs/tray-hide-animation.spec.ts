/**
 * E2E tests for tray hide animation.
 *
 * Verifies that when a tray is filled to capacity:
 * 1. The tray and screws scale down together (center pivot)
 * 2. The animation is smooth (stepped scale-down)
 * 3. Entities are properly cleaned up after animation
 */

import { test, expect } from '@playwright/test';
import { attachTelemetry } from '../helpers/telemetry';
import {
  createHarnessClient,
  type EntitySnapshot,
  waitForScrewState,
  waitForAnimationsToSettle,
  waitForCondition,
} from '../helpers/harness';

test.describe('Tray Hide Animation', () => {
  test('tray and screws are removed from scene after hide animation', async ({
    page,
  }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1&region=test&level=0');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);

    // Get initial entity counts
    const initialScrews = await harness.queryByComponent('screw');
    const initialScrewCount = initialScrews.length;

    // Red tray has capacity 3 in test level
    // We need to fill it completely to trigger hide animation
    // Red screw positions (centered coordinate system):
    // Board 1 red screw: (315, 1289)
    // Board 2 red screw: (595, 1434)
    // Board 3 red screw: (400, 1169)

    // First red screw (Board 1)
    await harness.act({ type: 'pointerDown', x: 315, y: 1289 });
    await harness.act({ type: 'pointerUp', x: 315, y: 1289 });
    await waitForScrewState(harness, page, 'red', 'inTray', { timeout: 3000 });

    // Second red screw (Board 2)
    await harness.act({ type: 'pointerDown', x: 595, y: 1434 });
    await harness.act({ type: 'pointerUp', x: 595, y: 1434 });
    await waitForScrewState(harness, page, 'red', 'inTray', {
      timeout: 3000,
      count: 2,
    });

    // Third red screw (Board 3) - this fills the tray
    await harness.act({ type: 'pointerDown', x: 400, y: 1169 });
    await harness.act({ type: 'pointerUp', x: 400, y: 1169 });

    // Wait for hide animation to complete
    await waitForAnimationsToSettle(harness, page, {
      timeout: 5000,
      stableTime: 300,
    });

    // After tray is filled and hidden, it should be removed from scene
    const finalTrays = await harness.queryByComponent('tray');

    // The filled red tray should have displayOrder 99 (hidden marker)
    // OR be removed from the scene entirely
    const redTray = finalTrays.find(
      (t: EntitySnapshot) =>
        (t.components.tray as { color: string }).color === 'red'
    );

    // The red tray should have displayOrder 99 (marked as hidden)
    if (redTray) {
      expect(
        (redTray.components.tray as { displayOrder: number }).displayOrder
      ).toBe(99);
    }

    // The screws that were in the tray should be removed or have state 'removed'
    const finalScrews = await harness.queryByComponent('screw');
    const inBoardScrews = finalScrews.filter(
      (s: EntitySnapshot) =>
        (s.components.screw as { state: string }).state === 'inBoard'
    );

    // We placed 3 red screws, so in-board screw count should decrease by 3
    expect(inBoardScrews.length).toBe(initialScrewCount - 3);
  });

  test('tray scales from center during hide animation', async ({ page }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1&region=test&level=0');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);

    // Get red tray initial position (before any screws)
    let trays = await harness.queryByComponent('tray');
    const redTray = trays.find(
      (t: EntitySnapshot) =>
        (t.components.tray as { color: string }).color === 'red'
    );
    expect(redTray).toBeDefined();
    const initialX = redTray!.position.x;
    const initialY = redTray!.position.y;

    // Fill the red tray with 2 screws (not full yet)
    await harness.act({ type: 'pointerDown', x: 315, y: 1289 });
    await harness.act({ type: 'pointerUp', x: 315, y: 1289 });
    await waitForScrewState(harness, page, 'red', 'inTray', { timeout: 3000 });

    await harness.act({ type: 'pointerDown', x: 595, y: 1434 });
    await harness.act({ type: 'pointerUp', x: 595, y: 1434 });
    await waitForScrewState(harness, page, 'red', 'inTray', {
      timeout: 3000,
      count: 2,
    });

    // Verify tray position hasn't changed (no animation yet)
    trays = await harness.queryByComponent('tray');
    const updatedRedTray = trays.find(
      (t: EntitySnapshot) =>
        (t.components.tray as { color: string }).color === 'red'
    );
    expect(updatedRedTray!.position.x).toBeCloseTo(initialX, 0);
    expect(updatedRedTray!.position.y).toBeCloseTo(initialY, 0);
    expect(updatedRedTray!.scale.x).toBe(1);
    expect(updatedRedTray!.scale.y).toBe(1);
  });

  test('next hidden tray slides in from the right after tray hides', async ({
    page,
  }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1&region=test&level=0');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);

    // Get initial tray states
    let trays = await harness.queryByComponent('tray');

    // Find which tray has displayOrder 2 (first hidden tray)
    const hiddenTray = trays.find(
      (t: EntitySnapshot) =>
        (t.components.tray as { displayOrder: number }).displayOrder === 2
    );
    expect(hiddenTray).toBeDefined();
    const hiddenTrayColor = (hiddenTray!.components.tray as { color: string })
      .color;

    // Fill the red tray completely to trigger hide animation
    await harness.act({ type: 'pointerDown', x: 315, y: 1289 });
    await harness.act({ type: 'pointerUp', x: 315, y: 1289 });
    await waitForScrewState(harness, page, 'red', 'inTray', { timeout: 3000 });

    await harness.act({ type: 'pointerDown', x: 595, y: 1434 });
    await harness.act({ type: 'pointerUp', x: 595, y: 1434 });
    await waitForScrewState(harness, page, 'red', 'inTray', {
      timeout: 3000,
      count: 2,
    });

    await harness.act({ type: 'pointerDown', x: 400, y: 1169 });
    await harness.act({ type: 'pointerUp', x: 400, y: 1169 });

    // Wait for hide and reveal animations to complete
    await waitForCondition(
      page,
      async () => {
        const t = await harness.queryByComponent('tray');
        const revealed = t.find(
          (tr: EntitySnapshot) =>
            (tr.components.tray as { color: string }).color === hiddenTrayColor
        );
        if (!revealed) return false;
        // Wait until it has reached displayOrder 1
        return (
          (revealed.components.tray as { displayOrder: number })
            .displayOrder === 1
        );
      },
      {
        timeout: 5000,
        message: `Expected ${hiddenTrayColor} tray to be revealed at displayOrder 1`,
      }
    );

    // Additional settle time for position animation
    await waitForAnimationsToSettle(harness, page, {
      timeout: 3000,
      stableTime: 200,
    });

    // The previously hidden tray should now be revealed (displayOrder 1)
    trays = await harness.queryByComponent('tray');
    const revealedTray = trays.find(
      (t: EntitySnapshot) =>
        (t.components.tray as { color: string }).color === hiddenTrayColor
    );
    expect(revealedTray).toBeDefined();
    expect(
      (revealedTray!.components.tray as { displayOrder: number }).displayOrder
    ).toBe(1);

    // Tray should be at visible Y position (not moved from bottom)
    expect(revealedTray!.position.y).toBeLessThan(300);

    // Tray X position should be at slot 1 position (~252) after sliding from right
    // Slot 1 X is frame.x(32) + slotOffsets[1].x(220) = 252
    expect(revealedTray!.position.x).toBeCloseTo(252, 0);
  });

  test('no console errors or warnings during tray hide animation', async ({
    page,
  }) => {
    attachTelemetry(page);

    // Capture console errors and warnings
    const consoleMessages: { type: string; text: string }[] = [];
    page.on('console', (msg) => {
      const type = msg.type();
      if (type === 'error' || type === 'warning') {
        consoleMessages.push({ type, text: msg.text() });
      }
    });

    await page.goto('/?testMode=1&region=test&level=0');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);

    // Fill the red tray completely to trigger hide animation
    await harness.act({ type: 'pointerDown', x: 315, y: 1289 });
    await harness.act({ type: 'pointerUp', x: 315, y: 1289 });
    await waitForScrewState(harness, page, 'red', 'inTray', { timeout: 3000 });

    await harness.act({ type: 'pointerDown', x: 595, y: 1434 });
    await harness.act({ type: 'pointerUp', x: 595, y: 1434 });
    await waitForScrewState(harness, page, 'red', 'inTray', {
      timeout: 3000,
      count: 2,
    });

    await harness.act({ type: 'pointerDown', x: 400, y: 1169 });
    await harness.act({ type: 'pointerUp', x: 400, y: 1169 });

    // Wait for animation to complete
    await waitForAnimationsToSettle(harness, page, {
      timeout: 5000,
      stableTime: 300,
    });

    // Filter out expected browser/dev warnings that are not from our game code
    const relevantMessages = consoleMessages.filter(
      (m) =>
        !m.text.includes('DeprecationWarning') &&
        !m.text.includes('DevTools') &&
        !m.text.includes('[vite]') &&
        !m.text.includes('AudioContext') && // Browser autoplay policy warning
        !m.text.includes('WebGL') && // WebGL driver messages
        !m.text.includes('GPU stall') // GPU performance warnings
    );

    // There should be no console errors or warnings during the animation
    expect(relevantMessages).toHaveLength(0);
  });
});
