/**
 * URL Parameter Utilities for Test Configuration
 *
 * This module provides functions to parse URL parameters that control
 * test behavior. These parameters allow E2E tests to configure the game
 * for deterministic, reproducible testing.
 *
 * @example
 * // Common test URLs:
 * // Basic test mode
 * // http://localhost:5173/?testMode
 *
 * // Skip intro and mute audio
 * // http://localhost:5173/?testMode&skipIntro&muteAudio
 *
 * // Deterministic seed for randomness
 * // http://localhost:5173/?testMode&seed=12345
 *
 * // Skip to specific scene
 * // http://localhost:5173/?testMode&scene=BossLevel
 *
 * @module
 */

/**
 * Configuration parameters parsed from the URL query string.
 *
 * These parameters control test behavior and can be used to make
 * tests more deterministic and faster.
 *
 * @example
 * // Check parameters in game code
 * import { getTestParams } from '@shared/debug';
 *
 * const params = getTestParams();
 * if (params.muteAudio) {
 *   // Don't play audio
 * }
 * if (params.skipIntro) {
 *   // Skip splash screen
 * }
 * if (params.seed !== undefined) {
 *   // Use seed for deterministic random
 *   Math.seedrandom(params.seed);
 * }
 */
export interface TestParams {
  /** True if running in test mode (testMode param present) */
  testMode: boolean;
  /** Random seed for deterministic randomness */
  seed?: number | undefined;
  /** Scene name to skip directly to */
  scene?: string | undefined;
  /** True to mute all audio (muteAudio param present) */
  muteAudio: boolean;
  /** True to skip intro/splash screens (skipIntro param present) */
  skipIntro: boolean;
}

/**
 * Parses URL query parameters for test configuration.
 *
 * Supported parameters:
 * - `testMode` - Enables test mode and harness
 * - `seed=<number>` - Sets random seed for determinism
 * - `scene=<name>` - Skip to specific scene
 * - `muteAudio` - Disables all audio
 * - `skipIntro` - Skips intro/splash screens
 *
 * @returns Parsed test parameters with defaults
 *
 * @example
 * import { getTestParams } from '@shared/debug';
 *
 * // URL: /?testMode&seed=42&skipIntro
 * const params = getTestParams();
 * // params = {
 * //   testMode: true,
 * //   seed: 42,
 * //   scene: undefined,
 * //   muteAudio: false,
 * //   skipIntro: true
 * // }
 *
 * @example
 * // Use in game initialization
 * const params = getTestParams();
 *
 * if (params.scene) {
 *   // Skip to the specified scene
 *   screens.show(params.scene);
 * } else if (params.skipIntro) {
 *   // Skip intro, go directly to game
 *   screens.show('GameScreen');
 * } else {
 *   // Normal flow
 *   screens.show('IntroScreen');
 * }
 */
export function getTestParams(): TestParams {
  const params = new URLSearchParams(window.location.search);
  const seedParam = params.get('seed');

  return {
    testMode: params.has('testMode') || params.get('testMode') === '1',
    seed: seedParam !== null ? parseInt(seedParam, 10) : undefined,
    scene: params.get('scene') ?? undefined,
    muteAudio: params.has('muteAudio') || params.get('muteAudio') === '1',
    skipIntro: params.has('skipIntro') || params.get('skipIntro') === '1',
  };
}

/**
 * Checks if the application is running in test mode.
 *
 * Test mode is enabled when either:
 * - The `testMode` URL parameter is present
 * - Running with Vite's test mode (`import.meta.env.MODE === 'test'`)
 *
 * @returns True if in test mode
 *
 * @example
 * import { isTestMode } from '@shared/debug';
 *
 * if (isTestMode()) {
 *   // Disable animations for faster tests
 *   gsap.globalTimeline.timeScale(100);
 * }
 *
 * @example
 * // Conditional test-only features
 * if (isTestMode()) {
 *   // Register scene with test harness
 *   window.__gameTest?.registerScene(this.scene);
 * }
 */
export function isTestMode(): boolean {
  return getTestParams().testMode || import.meta.env.MODE === 'test';
}
