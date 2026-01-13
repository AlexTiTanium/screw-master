/**
 * E2E tests for game boot.
 *
 * Tests that the game boots without errors in both dev and production builds.
 */

import { test, expect } from '@playwright/test';
import {
  attachTelemetry,
  printTelemetry,
  getErrors,
} from '../helpers/telemetry';

interface GameTestSnapshot {
  ready: boolean;
  scene: string;
  errors: { message: string; stack?: string; timestamp: number }[];
  bootTimeMs?: number;
}

test.describe('Game Boot', () => {
  test('game boots without errors', async ({ page }) => {
    const telemetry = attachTelemetry(page);

    await page.goto('/?testMode=1');

    try {
      await page.waitForFunction(
        () =>
          (window as unknown as { __gameTest?: { ready: boolean } }).__gameTest
            ?.ready === true,
        { timeout: 15000 }
      );
    } catch {
      printTelemetry(telemetry);

      const harnessState = await page.evaluate((): GameTestSnapshot => {
        const gameTest = (
          window as unknown as { __gameTest?: { snapshot(): GameTestSnapshot } }
        ).__gameTest;
        return (
          gameTest?.snapshot() ?? { ready: false, errors: [], scene: 'unknown' }
        );
      });
      console.log('\n=== GAME HARNESS STATE ===');
      console.log(JSON.stringify(harnessState, null, 2));

      throw new Error('Game did not become ready within timeout');
    }

    printTelemetry(telemetry);

    const snapshot = await page.evaluate((): GameTestSnapshot => {
      const gameTest = (
        window as unknown as { __gameTest?: { snapshot(): GameTestSnapshot } }
      ).__gameTest;
      if (!gameTest) {
        throw new Error('Game test harness not found');
      }
      return gameTest.snapshot();
    });

    const errors = getErrors(telemetry);
    const harnessErrors = snapshot.errors.map((e) => e.message);
    const allErrors = [...errors, ...harnessErrors];

    const criticalErrors = allErrors.filter(
      (e) => !e.includes('Failed to load test image')
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test('game renders visible canvas', async ({ page }) => {
    const telemetry = attachTelemetry(page);

    await page.goto('/?testMode=1');

    await page.waitForFunction(
      () =>
        (window as unknown as { __gameTest?: { ready: boolean } }).__gameTest
          ?.ready === true,
      { timeout: 15000 }
    );

    const canvasInfo = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return null;
      return {
        width: canvas.width,
        height: canvas.height,
        clientWidth: canvas.clientWidth,
        clientHeight: canvas.clientHeight,
      };
    });

    printTelemetry(telemetry);

    expect(canvasInfo).not.toBeNull();
    expect(canvasInfo?.width).toBeGreaterThan(0);
    expect(canvasInfo?.height).toBeGreaterThan(0);
  });
});

// Test against the preview build (production)
// Note: Requires `npm run preview` to be running on port 4173
// Skip by default - run with: npx playwright test boot.spec.ts --grep "Preview"
test.describe.skip('Preview Build Boot', () => {
  test.use({ baseURL: 'http://localhost:4173' });

  test('preview build boots without errors', async ({ page }) => {
    const telemetry = attachTelemetry(page);

    await page.goto('/?testMode=1');

    try {
      await page.waitForFunction(
        () =>
          (window as unknown as { __gameTest?: { ready: boolean } }).__gameTest
            ?.ready === true,
        { timeout: 15000 }
      );
    } catch {
      printTelemetry(telemetry);
      throw new Error('Game did not become ready within timeout');
    }

    printTelemetry(telemetry);

    const snapshot = await page.evaluate((): GameTestSnapshot => {
      const gameTest = (
        window as unknown as { __gameTest?: { snapshot(): GameTestSnapshot } }
      ).__gameTest;
      if (!gameTest) {
        throw new Error('Game test harness not found');
      }
      return gameTest.snapshot();
    });

    const errors = getErrors(telemetry);
    const harnessErrors = snapshot.errors.map((e) => e.message);
    const allErrors = [...errors, ...harnessErrors];

    expect(allErrors).toHaveLength(0);
  });
});
