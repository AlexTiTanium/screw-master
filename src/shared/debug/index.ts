/**
 * Game Test Harness Module
 *
 * Provides E2E testing infrastructure for the game application. The test harness
 * exposes game state and action simulation capabilities via `window.__gameTest`
 * for use with Playwright or other E2E testing frameworks.
 *
 * The harness is automatically initialized in dev mode or when the `testMode`
 * URL parameter is present.
 *
 * @example
 * // Initialize the harness in your app bootstrap
 * import { initTestHarness, markGameReady } from '@shared/debug';
 *
 * // Call early in bootstrap
 * initTestHarness();
 *
 * // ... initialize game ...
 *
 * // Call when game is ready
 * markGameReady('GameScene');
 *
 * @example
 * // Use in Playwright E2E tests
 * import { test, expect } from '@playwright/test';
 *
 * test('game initializes correctly', async ({ page }) => {
 *   await page.goto('/?testMode');
 *
 *   // Wait for game to be ready
 *   await page.waitForFunction(() => window.__gameTest?.ready);
 *
 *   // Verify no errors
 *   const errors = await page.evaluate(() => window.__gameTest?.errors);
 *   expect(errors).toHaveLength(0);
 *
 *   // Query entities
 *   const entities = await page.evaluate(() =>
 *     window.__gameTest?.ecs.getEntities()
 *   );
 *   expect(entities?.length).toBeGreaterThan(0);
 * });
 *
 * @module
 */

import type {
  GameTestHarness,
  GameTestError,
  TestAction,
  ActionResult,
} from './types';
import { setupErrorCapture } from './errorCapture';
import { isTestMode, getTestParams } from './urlParams';
import {
  createECSAccess,
  createRenderSignatureGenerator,
  createActionExecutor,
} from './harness';

export type {
  GameTestHarness,
  GameTestError,
  TestAction,
  ActionResult,
  EntitySnapshot,
  RenderSignature,
  ECSAccess,
} from './types';
export { getTestParams, isTestMode } from './urlParams';

function createHarness(): GameTestHarness {
  const errors: GameTestError[] = [];
  let ready = false;
  let scene = '';
  const bootStartTime = performance.now();
  let bootEndTime: number | undefined;

  // Scene state tracking
  let sceneState: 'running' | 'paused' | 'stopped' = 'stopped';

  // Create ECS access layer
  const ecsAccess = createECSAccess();

  // Create render signature generator
  const getRenderSignature = createRenderSignatureGenerator(
    () => ecsAccess.getEntities(),
    () => sceneState
  );

  // Create action executor
  const executeAction = createActionExecutor(
    () => ecsAccess.getScene(),
    () => document.querySelector<HTMLCanvasElement>('canvas')
  );

  const harness: GameTestHarness = {
    get ready() {
      return ready;
    },
    get scene() {
      return scene;
    },
    get bootStartTime() {
      return bootStartTime;
    },
    get bootEndTime() {
      return bootEndTime;
    },
    get errors() {
      return errors;
    },
    metrics: {},

    ecs: ecsAccess,

    markReady(sceneName: string): void {
      ready = true;
      scene = sceneName;
      sceneState = 'running';
      bootEndTime = performance.now();
      // eslint-disable-next-line no-console
      console.log(
        `[TestHarness] Game ready in ${(bootEndTime - bootStartTime).toFixed(0)}ms, scene: ${sceneName}`
      );
    },

    captureError(error: Error | string, source?: string): void {
      const err: GameTestError = {
        message: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: performance.now(),
        source,
      };
      errors.push(err);
      // eslint-disable-next-line no-console
      console.error('[TestHarness] Error captured:', err.message, source ?? '');
    },

    snapshot() {
      return {
        ready,
        scene,
        errors: [...errors],
        bootTimeMs: bootEndTime ? bootEndTime - bootStartTime : undefined,
      };
    },

    registerScene(sceneInstance: unknown): void {
      ecsAccess._setScene(sceneInstance);
      // eslint-disable-next-line no-console
      console.log('[TestHarness] Scene registered');
    },

    getRenderSignature,

    async act(action: TestAction): Promise<ActionResult> {
      // Track pause/resume state changes
      if (action.type === 'pause') {
        sceneState = 'paused';
      } else if (action.type === 'resume') {
        sceneState = 'running';
      }
      return executeAction(action);
    },

    async actMany(actions: TestAction[]): Promise<ActionResult[]> {
      const results: ActionResult[] = [];
      for (const action of actions) {
        results.push(await harness.act(action));
      }
      return results;
    },
  };

  return harness;
}

/**
 * Initializes the test harness if running in dev or test mode.
 *
 * This function should be called early in the application bootstrap process,
 * before any game logic runs. It creates the `window.__gameTest` object and
 * sets up global error capture.
 *
 * The harness is only created when:
 * - Running in Vite dev mode (`import.meta.env.DEV`)
 * - The `testMode` URL parameter is present
 *
 * @example
 * // In app bootstrap
 * import { initTestHarness } from '@shared/debug';
 *
 * async function bootstrap() {
 *   // Initialize harness first
 *   initTestHarness();
 *
 *   // Then bootstrap the app...
 *   const app = new Application();
 *   await app.start();
 * }
 *
 * @example
 * // Access via URL parameter
 * // http://localhost:5173/?testMode
 * // http://localhost:5173/?testMode&skipIntro&muteAudio
 */
export function initTestHarness(): void {
  // Only initialize in dev mode or when testMode param is present
  if (import.meta.env.DEV || isTestMode()) {
    // eslint-disable-next-line no-console
    console.log('[TestHarness] Initializing test harness...');

    window.__gameTest = createHarness();
    setupErrorCapture();

    const params = getTestParams();
    // eslint-disable-next-line no-console
    console.log('[TestHarness] Test params:', params);
  }
}

/**
 * Marks the game as ready for testing.
 *
 * Call this function after all initialization is complete and the game is
 * in a stable state for E2E tests to begin. This sets `harness.ready = true`
 * and records the boot time.
 *
 * In E2E tests, you typically wait for this:
 * ```typescript
 * await page.waitForFunction(() => window.__gameTest?.ready === true);
 * ```
 *
 * @param scene - Name of the current scene/screen (e.g., 'GameScene')
 *
 * @example
 * // In your screen's onShow method
 * import { markGameReady } from '@shared/debug';
 *
 * class GameScreen implements Screen {
 *   async onEnter(): Promise<void> {
 *     await this.gameScene.init();
 *     this.gameScene.start();
 *
 *     // Signal that game is ready for testing
 *     markGameReady('GameScene');
 *   }
 * }
 */
export function markGameReady(scene: string): void {
  if (window.__gameTest) {
    window.__gameTest.markReady(scene);
  }
}
