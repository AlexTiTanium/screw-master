/**
 * Global Error Capture for Test Harness
 *
 * This module sets up global error handlers that capture all uncaught
 * errors and unhandled promise rejections into the test harness.
 * This enables E2E tests to verify that no errors occurred during test runs.
 *
 * @example
 * // Verify no errors in E2E test
 * const errors = await page.evaluate(() => window.__gameTest?.errors);
 * expect(errors).toHaveLength(0);
 *
 * @module
 */

/**
 * Sets up global error handlers to capture errors into the test harness.
 *
 * Captures:
 * - Uncaught exceptions (window 'error' event)
 * - Unhandled promise rejections (window 'unhandledrejection' event)
 *
 * Errors are stored in `window.__gameTest.errors` with:
 * - Error message
 * - Stack trace (if available)
 * - Timestamp
 * - Source location
 *
 * This function is called automatically by `initTestHarness()`.
 *
 * @example
 * // Already called by initTestHarness, but can be called directly
 * import { setupErrorCapture } from './errorCapture';
 *
 * setupErrorCapture();
 *
 * @example
 * // In E2E test, check for errors after an action
 * await page.click('#dangerousButton');
 *
 * const errors = await page.evaluate(() => window.__gameTest?.errors);
 * if (errors && errors.length > 0) {
 *   console.error('Errors occurred:', errors);
 *   throw new Error(`Found ${errors.length} error(s)`);
 * }
 */
export function setupErrorCapture(): void {
  // Capture uncaught errors
  window.addEventListener('error', (event) => {
    const error: unknown = event.error;
    if (window.__gameTest) {
      window.__gameTest.captureError(
        error instanceof Error ? error : new Error(event.message),
        `${event.filename}:${String(event.lineno)}:${String(event.colno)}`
      );
    }
  });

  // Capture unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    if (window.__gameTest) {
      const reason: unknown = event.reason;
      window.__gameTest.captureError(
        reason instanceof Error ? reason : new Error(String(reason)),
        'unhandledrejection'
      );
    }
  });
}
