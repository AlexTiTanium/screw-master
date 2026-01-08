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

/** Internal state for the harness. */
interface HarnessState {
  errors: GameTestError[];
  ready: boolean;
  scene: string;
  bootStartTime: number;
  bootEndTime: number | undefined;
  sceneState: 'running' | 'paused' | 'stopped';
}

/**
 * Creates harness state getters.
 *
 * @param state - The harness state object
 * @returns Object with getter properties
 *
 * @example
 * const getters = createStateGetters(state);
 */
function createStateGetters(
  state: HarnessState
): Pick<
  GameTestHarness,
  'ready' | 'scene' | 'bootStartTime' | 'bootEndTime' | 'errors'
> {
  return {
    get ready(): boolean {
      return state.ready;
    },
    get scene(): string {
      return state.scene;
    },
    get bootStartTime(): number {
      return state.bootStartTime;
    },
    get bootEndTime(): number | undefined {
      return state.bootEndTime;
    },
    get errors(): GameTestError[] {
      return state.errors;
    },
  };
}

/**
 * Creates harness action methods.
 *
 * @param state - The harness state object
 * @param executeAction - Action executor function
 * @returns Object with action methods
 *
 * @example
 * const actions = createActionMethods(state, executeAction);
 */
function createActionMethods(
  state: HarnessState,
  executeAction: (action: TestAction) => Promise<ActionResult>
): Pick<GameTestHarness, 'act' | 'actMany'> {
  const act = async (action: TestAction): Promise<ActionResult> => {
    if (action.type === 'pause') {
      state.sceneState = 'paused';
    } else if (action.type === 'resume') {
      state.sceneState = 'running';
    }
    return executeAction(action);
  };

  return {
    act,
    async actMany(actions: TestAction[]): Promise<ActionResult[]> {
      const results: ActionResult[] = [];
      for (const a of actions) {
        results.push(await act(a));
      }
      return results;
    },
  };
}

/**
 * Creates snapshot and error capture methods.
 *
 * @param state - The harness state
 * @returns Object with snapshot and captureError methods
 * @internal
 */
function createSnapshotMethods(
  state: HarnessState
): Pick<GameTestHarness, 'captureError' | 'snapshot'> {
  return {
    captureError(error: Error | string, source?: string): void {
      state.errors.push({
        message: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: performance.now(),
        source,
      });
    },
    snapshot: () => ({
      ready: state.ready,
      scene: state.scene,
      errors: [...state.errors],
      bootTimeMs: state.bootEndTime
        ? state.bootEndTime - state.bootStartTime
        : undefined,
    }),
  };
}

/**
 * Creates harness lifecycle methods.
 *
 * @param state - The harness state
 * @param ecsAccess - The ECS access layer
 * @returns Object with lifecycle methods
 *
 * @example
 * const lifecycle = createLifecycleMethods(state, ecsAccess);
 */
function createLifecycleMethods(
  state: HarnessState,
  ecsAccess: ReturnType<typeof createECSAccess>
): Pick<
  GameTestHarness,
  'markReady' | 'captureError' | 'snapshot' | 'registerScene'
> {
  return {
    markReady(sceneName: string): void {
      state.ready = true;
      state.scene = sceneName;
      state.sceneState = 'running';
      state.bootEndTime = performance.now();
    },
    ...createSnapshotMethods(state),
    registerScene(sceneInstance: unknown): void {
      ecsAccess._setScene(sceneInstance);
    },
  };
}

/**
 * Creates the test harness instance.
 *
 * @returns Configured GameTestHarness
 *
 * @example
 * const harness = createHarness();
 */
function createHarness(): GameTestHarness {
  const state: HarnessState = {
    errors: [],
    ready: false,
    scene: '',
    bootStartTime: performance.now(),
    bootEndTime: undefined,
    sceneState: 'stopped',
  };

  const ecsAccess = createECSAccess();
  const executeAction = createActionExecutor(
    () => ecsAccess.getScene(),
    () => document.querySelector<HTMLCanvasElement>('canvas')
  );

  return {
    ...createStateGetters(state),
    ...createActionMethods(state, executeAction),
    ...createLifecycleMethods(state, ecsAccess),
    metrics: {},
    ecs: ecsAccess,
    getRenderSignature: createRenderSignatureGenerator(
      () => ecsAccess.getEntities(),
      () => state.sceneState
    ),
  };
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
