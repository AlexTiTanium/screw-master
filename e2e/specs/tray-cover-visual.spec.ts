/**
 * Visual test to capture tray cover positioning.
 */

import { test } from '@playwright/test';
import { attachTelemetry } from '../helpers/telemetry';
import { createHarnessClient } from '../helpers/harness';

test.describe('Tray Cover Visual', () => {
  test('capture tray area screenshot', async ({ page }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1&region=test&level=0');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);

    // Wait for everything to render
    await page.waitForTimeout(500);

    // Take a full page screenshot
    await page.screenshot({
      path: 'e2e/screenshots/tray-cover-state.png',
      fullPage: false,
    });
  });
});
