/**
 * Screenshot capture for PR documentation.
 * Run with: npx playwright test e2e/screenshot.spec.ts
 */

import { test } from '@playwright/test';

const RESOLUTIONS = [
  { name: 'mobile', width: 390, height: 844 },    // iPhone 14
  { name: 'tablet', width: 820, height: 1180 },   // iPad Air
  { name: 'desktop', width: 1920, height: 1080 }, // Full HD
];

test.describe('Screenshots', () => {
  for (const { name, width, height } of RESOLUTIONS) {
    test(`capture ${name} (${width}x${height})`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/?testMode=1&region=test&level=0');

      // Wait for game to be ready
      await page.waitForFunction(
        () =>
          (window as unknown as { __gameTest?: { ready: boolean } }).__gameTest
            ?.ready === true,
        { timeout: 15000 }
      );

      // Wait a bit for rendering to settle
      await page.waitForTimeout(500);

      await page.screenshot({
        path: `screenshots/game-${name}-${width}x${height}.png`,
        fullPage: false,
      });
    });
  }
});
