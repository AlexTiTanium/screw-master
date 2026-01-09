import { test as base } from '@playwright/test';
import { createHarnessClient, type HarnessClient } from './helpers/harness';
import {
  attachTelemetry,
  printTelemetry,
  getErrors,
  type Telemetry,
} from './helpers/telemetry';

/**
 * Extended Playwright test fixtures for game E2E testing.
 *
 * These fixtures automatically set up the test harness and telemetry,
 * reducing boilerplate in test files.
 *
 * @example
 * // Use in a test file
 * import { test, expect } from '../fixtures';
 *
 * test('game entities are created', async ({ harness }) => {
 *   const entities = await harness.getEntities();
 *   expect(entities.length).toBeGreaterThan(0);
 * });
 *
 * @example
 * // Access telemetry for debugging
 * test('game boots without errors', async ({ harness, telemetry }) => {
 *   const errors = getErrors(telemetry);
 *   expect(errors).toHaveLength(0);
 * });
 */

export interface GameTestFixtures {
  /**
   * The game test harness client.
   * Automatically waits for the game to be ready before the test runs.
   */
  harness: HarnessClient;

  /**
   * Telemetry collector for console logs, page errors, and network errors.
   */
  telemetry: Telemetry;

  /**
   * Navigate to the game with test mode enabled.
   * This is called automatically by the harness fixture.
   */
  gameUrl: string;
}

/**
 * Extended test function with game fixtures.
 *
 * Provides `harness` and `telemetry` fixtures automatically.
 * Tests using this will have the game loaded and ready before they run.
 */
export const test = base.extend<GameTestFixtures>({
  // Default game URL with test mode
  gameUrl: '/?testMode=1',

  // Telemetry fixture - attaches before navigation
  telemetry: async ({ page }, use) => {
    const telemetry = attachTelemetry(page);
    await use(telemetry);

    // Print telemetry after test (useful for debugging failures)
    if (process.env.DEBUG_TELEMETRY) {
      printTelemetry(telemetry);
    }
  },

  // Harness fixture - navigates and waits for ready
  harness: async ({ page, gameUrl, telemetry }, use) => {
    // Navigate to game with test mode
    await page.goto(gameUrl);

    // Create harness client
    const harness = createHarnessClient(page);

    // Wait for game to be ready
    try {
      await harness.waitForReady(10000);
    } catch {
      // Print telemetry on failure to help debugging
      printTelemetry(telemetry);
      throw new Error('Game did not become ready within timeout');
    }

    await use(harness);
  },
});

/**
 * Re-export expect from Playwright for convenience
 */
export { expect } from '@playwright/test';

/**
 * Helper to get errors from telemetry
 */
export { getErrors, printTelemetry };

/**
 * Filter function to exclude expected/known errors
 */
export function filterCriticalErrors(
  errors: string[],
  ignoredPatterns: string[] = ['Failed to load test image']
): string[] {
  return errors.filter(
    (error) => !ignoredPatterns.some((pattern) => error.includes(pattern))
  );
}
