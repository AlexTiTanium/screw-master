/**
 * Gameplay demo test that records video of completing a level.
 * This test is used to generate demo GIFs for documentation and PRs.
 */

import { test } from '@playwright/test';
import { attachTelemetry } from '../helpers/telemetry';
import { createHarnessClient } from '../helpers/harness';

// Enable video recording for this test with portrait viewport (matching game aspect ratio)
test.use({
  video: { mode: 'on', size: { width: 360, height: 640 } },
  viewport: { width: 360, height: 640 },
});

test.describe('Gameplay Demo', () => {
  test('complete level playthrough for demo video', async ({ page }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1&region=test&level=0');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);

    // Wait a moment for the level to fully render
    await page.waitForTimeout(500);

    // Screw positions using centered coordinate system:
    // Board 1 (walnut 270x260) at local (-140, 170) -> world (400, 1369), halfSize (135, 130)
    // Board 2 (birch 270x260) at local (140, 170) -> world (680, 1369), halfSize (135, 130)
    // Board 3 (mahogany 270x260) at local (-140, -100) -> world (400, 1099), halfSize (135, 130)
    // Board 4 (pine 501x317) at local (-30, -250) -> world (510, 949), halfSize (250.5, 158.5)
    //
    // Screw world positions = boardWorld - halfSize + screwLocal

    // Play sequence - tap screws in order to demonstrate the coordinate system
    const screwSequence = [
      { x: 315, y: 1289, delay: 800 }, // Red on Board 1 -> red tray
      { x: 485, y: 1289, delay: 800 }, // Blue on Board 1 -> blue tray
      { x: 680, y: 1304, delay: 800 }, // Yellow on Board 2 -> buffer (hidden)
      { x: 400, y: 1369, delay: 800 }, // Green on Board 1 -> buffer (hidden)
      { x: 595, y: 1434, delay: 800 }, // Red on Board 2 -> red tray
      { x: 765, y: 1434, delay: 800 }, // Blue on Board 2 -> blue tray
      { x: 315, y: 1019, delay: 800 }, // Green on Board 3 -> buffer
      { x: 485, y: 1019, delay: 800 }, // Yellow on Board 3 -> buffer
    ];

    for (const screw of screwSequence) {
      // Tap the screw
      await harness.act({ type: 'pointerDown', x: screw.x, y: screw.y });
      await harness.act({ type: 'pointerUp', x: screw.x, y: screw.y });

      // Wait for animation to complete
      await page.waitForTimeout(screw.delay);
    }

    // Wait a moment to show the final state
    await page.waitForTimeout(1500);

    // The video will be saved automatically by Playwright
  });
});
