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

// Test against the preview build (production)
// Note: Requires `npm run preview` to be running on port 4173
// Skip by default - run with: npx playwright test preview-boot.spec.ts
test.describe.skip('Preview Build Boot', () => {
  test.use({ baseURL: 'http://localhost:4173' });

  test('preview build boots without errors', async ({ page }) => {
    const telemetry = attachTelemetry(page);

    await page.goto('/?testMode=1');

    // Wait for game to signal ready
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

    expect(allErrors).toHaveLength(0);
  });
});
