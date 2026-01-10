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

    // Navigate to game with test mode enabled
    await page.goto('/?testMode=1');

    // Wait for game to signal ready (or timeout)
    try {
      await page.waitForFunction(
        () =>
          (window as unknown as { __gameTest?: { ready: boolean } }).__gameTest
            ?.ready === true,
        { timeout: 15000 }
      );
    } catch {
      // If timeout, print telemetry and fail
      printTelemetry(telemetry);

      // Get game harness state if available
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

    // Print telemetry for debugging
    printTelemetry(telemetry);

    // Get final state
    const snapshot = await page.evaluate((): GameTestSnapshot => {
      const gameTest = (
        window as unknown as { __gameTest?: { snapshot(): GameTestSnapshot } }
      ).__gameTest;
      if (!gameTest) {
        throw new Error('Game test harness not found');
      }
      return gameTest.snapshot();
    });

    // Assert no errors
    const errors = getErrors(telemetry);
    const harnessErrors = snapshot.errors.map((e) => e.message);
    const allErrors = [...errors, ...harnessErrors];

    // Filter out expected warnings (like test image not found)
    const criticalErrors = allErrors.filter(
      (e) => !e.includes('Failed to load test image')
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test('game renders visible canvas', async ({ page }) => {
    const telemetry = attachTelemetry(page);

    await page.goto('/?testMode=1');

    // Wait for ready
    await page.waitForFunction(
      () =>
        (window as unknown as { __gameTest?: { ready: boolean } }).__gameTest
          ?.ready === true,
      { timeout: 15000 }
    );

    // Check canvas exists and has size
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
