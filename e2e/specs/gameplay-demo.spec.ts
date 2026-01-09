/**
 * Gameplay demo test that records video of completing a level.
 * This test is used to generate demo GIFs for documentation and PRs.
 */

import { test } from '@playwright/test';
import { attachTelemetry } from '../helpers/telemetry';
import { createHarnessClient } from '../helpers/harness';

// Enable video recording for this test
test.use({
  video: { mode: 'on', size: { width: 450, height: 800 } },
});

test.describe('Gameplay Demo', () => {
  test('complete level playthrough for demo video', async ({ page }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1&region=test&level=0');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);

    // Wait a moment for the level to fully render
    await page.waitForTimeout(500);

    // Screw positions in the test level:
    // Board 1 (200, 800): red (250, 850), blue (420, 850), green (335, 930)
    // Board 2 (550, 800): yellow (685, 865), red (600, 995), blue (770, 995)

    // Play sequence - tap screws in order to complete the level
    const screwSequence = [
      { x: 250, y: 850, delay: 600 }, // Red screw -> red tray
      { x: 420, y: 850, delay: 600 }, // Blue screw -> blue tray
      { x: 685, y: 865, delay: 600 }, // Yellow screw -> buffer (hidden tray)
      { x: 335, y: 930, delay: 600 }, // Green screw -> buffer (hidden tray)
      { x: 600, y: 995, delay: 600 }, // Red screw -> red tray
      { x: 770, y: 995, delay: 800 }, // Blue screw -> blue tray (win!)
    ];

    for (const screw of screwSequence) {
      // Tap the screw
      await harness.act({ type: 'pointerDown', x: screw.x, y: screw.y });
      await harness.act({ type: 'pointerUp', x: screw.x, y: screw.y });

      // Wait for animation to complete
      await page.waitForTimeout(screw.delay);
    }

    // Wait a moment to show the win state
    await page.waitForTimeout(1000);

    // The video will be saved automatically by Playwright
  });
});
