/**
 * Test Harness Type Definitions
 *
 * This module provides type definitions for the game test harness, which enables
 * E2E testing by exposing game state and providing action simulation capabilities.
 *
 * The harness is exposed on `window.__gameTest` when running in dev mode or
 * when the `testMode` URL parameter is present.
 *
 * @example
 * // Access the test harness in E2E tests (Playwright)
 * const harness = await page.evaluate(() => window.__gameTest);
 * expect(harness?.ready).toBe(true);
 *
 * @example
 * // Wait for game to be ready
 * await page.waitForFunction(() => window.__gameTest?.ready === true);
 *
 * @module
 */

/**
 * Represents an error captured by the test harness.
 *
 * Errors are automatically captured from window.onerror and unhandled
 * promise rejections, or can be manually captured via the harness.
 *
 * @example
 * // Access captured errors via the harness
 * const errors = window.__gameTest?.errors ?? [];
 * for (const error of errors) {
 *   console.log(`[${error.timestamp}ms] ${error.message}`);
 *   if (error.source) console.log(`  Source: ${error.source}`);
 * }
 *
 * @example
 * // Manually capture an error
 * window.__gameTest?.captureError(new Error('Test failed'), 'MyTest');
 */
export interface GameTestError {
  /** Human-readable error message */
  message: string;
  /** Stack trace if available */
  stack?: string | undefined;
  /** Performance timestamp when the error was captured (ms since page load) */
  timestamp: number;
  /** Source location or context where the error occurred */
  source?: string | undefined;
}

/**
 * Performance metrics collected by the test harness.
 *
 * These metrics can be used to detect performance regressions in E2E tests.
 *
 * @example
 * // Check performance in E2E test
 * const metrics = await page.evaluate(() => window.__gameTest?.metrics);
 * expect(metrics?.fps).toBeGreaterThan(30);
 * expect(metrics?.entities).toBeLessThan(1000);
 */
export interface GameTestMetrics {
  /** Current frames per second */
  fps?: number;
  /** Number of draw calls per frame */
  drawCalls?: number;
  /** Number of loaded textures */
  textures?: number;
  /** Number of active entities */
  entities?: number;
}

// ============================================================================
// Entity & Render Signature Types
// ============================================================================

/**
 * Serialized snapshot of an ODIE entity's state.
 *
 * Used by the test harness to expose entity data for assertions without
 * requiring direct access to ODIE internals.
 *
 * @example
 * // Get entity snapshot in E2E test
 * const entities = await page.evaluate(() =>
 *   window.__gameTest?.ecs.getEntities()
 * );
 * const player = entities?.find(e => e.type === 'PlayerEntity');
 * expect(player?.position.x).toBeCloseTo(100, 1);
 *
 * @example
 * // Check component data
 * const square = await page.evaluate(() =>
 *   window.__gameTest?.ecs.queryByComponent('testSquare')[0]
 * );
 * expect(square?.components.testSquare).toEqual({ size: 100, color: 0xff0000 });
 */
export interface EntitySnapshot {
  /** Unique entity ID (ODIE uses numeric UIDs) */
  id: string | number;
  /** Entity type/constructor name */
  type: string;
  /** World position */
  position: { x: number; y: number };
  /** Scale */
  scale: { x: number; y: number };
  /** Rotation in radians */
  rotation: number;
  /** Visibility flag */
  visible: boolean;
  /** Opacity (0-1) */
  alpha: number;
  /** Bounding box in world coordinates, null if unavailable */
  bounds: { x: number; y: number; width: number; height: number } | null;
  /** Component data keyed by component name */
  components: Record<string, unknown>;
  /** Number of child display objects */
  childCount: number;
}

/**
 * Deterministic snapshot of the entire render state.
 *
 * RenderSignature provides a complete picture of the game state at a point
 * in time, with a hash for quick equality comparisons. This is useful for
 * detecting visual regressions and verifying game state in E2E tests.
 *
 * @example
 * // Capture render signature for comparison
 * const sig1 = await page.evaluate(() =>
 *   window.__gameTest?.getRenderSignature()
 * );
 *
 * // Perform some action
 * await page.click('canvas');
 *
 * // Verify state changed
 * const sig2 = await page.evaluate(() =>
 *   window.__gameTest?.getRenderSignature()
 * );
 * expect(sig2?.hash).not.toBe(sig1?.hash);
 *
 * @example
 * // Wait for stable render state (no changes for 100ms)
 * async function waitForStableRender(page) {
 *   let lastHash = '';
 *   while (true) {
 *     const sig = await page.evaluate(() =>
 *       window.__gameTest?.getRenderSignature()
 *     );
 *     if (sig?.hash === lastHash) break;
 *     lastHash = sig?.hash ?? '';
 *     await page.waitForTimeout(100);
 *   }
 * }
 */
export interface RenderSignature {
  /** Performance timestamp when signature was captured */
  timestamp: number;
  /** Frame counter */
  frame: number;
  /** Total entity count */
  entityCount: number;
  /** Sorted array of entity snapshots */
  entities: EntitySnapshot[];
  /** Active system names */
  systems: string[];
  /** Current scene state */
  sceneState: 'running' | 'paused' | 'stopped';
  /** Deterministic hash for quick comparison */
  hash: string;
}

// ============================================================================
// Action DSL Types
// ============================================================================

/**
 * Test action that can be executed against the game.
 *
 * Actions provide a declarative way to simulate user input and manipulate
 * game state in E2E tests. They are executed via `harness.act()` or
 * `harness.actMany()`.
 *
 * @example
 * // Move an entity
 * await page.evaluate(() =>
 *   window.__gameTest?.act({
 *     type: 'setPosition',
 *     entityId: '123',
 *     x: 200,
 *     y: 300
 *   })
 * );
 *
 * @example
 * // Simulate a click
 * await page.evaluate(() =>
 *   window.__gameTest?.actMany([
 *     { type: 'pointerDown', x: 100, y: 100 },
 *     { type: 'wait', ms: 50 },
 *     { type: 'pointerUp', x: 100, y: 100 }
 *   ])
 * );
 *
 * @example
 * // Keyboard input
 * await page.evaluate(() =>
 *   window.__gameTest?.actMany([
 *     { type: 'keyDown', key: ' ', code: 'Space' },
 *     { type: 'wait', ms: 100 },
 *     { type: 'keyUp', key: ' ', code: 'Space' }
 *   ])
 * );
 *
 * @example
 * // Manual frame advance (for deterministic testing)
 * await page.evaluate(() =>
 *   window.__gameTest?.actMany([
 *     { type: 'pause' },
 *     { type: 'tick', deltaMs: 16.67 }, // Advance one frame at 60fps
 *     { type: 'tick', deltaMs: 16.67 },
 *     { type: 'resume' }
 *   ])
 * );
 */
export type TestAction =
  | { type: 'setPosition'; entityId: string; x: number; y: number }
  | {
      type: 'setComponent';
      entityId: string;
      component: string;
      data: Record<string, unknown>;
    }
  | { type: 'setVisible'; entityId: string; visible: boolean }
  | { type: 'destroyEntity'; entityId: string }
  | { type: 'tick'; deltaMs: number }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'pointerDown'; x: number; y: number; button?: number }
  | { type: 'pointerUp'; x: number; y: number; button?: number }
  | { type: 'pointerMove'; x: number; y: number }
  | { type: 'keyDown'; key: string; code: string }
  | { type: 'keyUp'; key: string; code: string }
  | { type: 'wait'; ms: number };

/**
 * Represents a recorded user action with timing information.
 * Used for including user input history in bug reports.
 *
 * @example
 * // Recorded actions can be replayed in E2E tests
 * for (const { action } of recordedActions) {
 *   await harness.act(action);
 * }
 */
export interface RecordedAction {
  /** The action that was executed */
  action: TestAction;
  /** Game tick when the action occurred (-1 if not available) */
  tick: number;
  /** Performance timestamp when the action occurred (ms since page load) */
  timestamp: number;
}

/**
 * Result of executing a test action.
 *
 * @example
 * const result = await page.evaluate(() =>
 *   window.__gameTest?.act({ type: 'setPosition', entityId: '123', x: 0, y: 0 })
 * );
 * if (!result?.success) {
 *   throw new Error(`Action failed: ${result?.error}`);
 * }
 */
export interface ActionResult {
  /** Whether the action completed successfully */
  success: boolean;
  /** Error message if the action failed */
  error?: string;
  /** Optional data returned by the action */
  data?: unknown;
}

// ============================================================================
// ECS Access Types
// ============================================================================

/**
 * Interface for accessing ODIE ECS data from the test harness.
 *
 * ECSAccess provides methods to query entities and their components without
 * direct access to ODIE internals. All entity data is serialized to plain
 * objects for safe cross-context access (e.g., from Playwright evaluate).
 *
 * @example
 * // Get all entities
 * const entities = await page.evaluate(() =>
 *   window.__gameTest?.ecs.getEntities()
 * );
 *
 * @example
 * // Query entities by component
 * const squares = await page.evaluate(() =>
 *   window.__gameTest?.ecs.queryByComponent('testSquare')
 * );
 *
 * @example
 * // Check entity existence
 * const exists = await page.evaluate((id) =>
 *   window.__gameTest?.ecs.hasEntity(id),
 *   entityId
 * );
 */
export interface ECSAccess {
  /** Get the current ODIE Scene2D instance (null if not registered) */
  getScene(): unknown;
  /** Get all entities in the scene as serialized snapshots */
  getEntities(): EntitySnapshot[];
  /** Get entity by ID, returns null if not found */
  getEntity(id: string): EntitySnapshot | null;
  /** Query entities that have a specific component */
  queryByComponent(componentName: string): EntitySnapshot[];
  /** Get total count of entities in the scene */
  getEntityCount(): number;
  /** Check if an entity with the given ID exists */
  hasEntity(id: string): boolean;
  /** Get names of all registered systems in the scene */
  getSystems(): string[];
}

// ============================================================================
// Main Harness Interface
// ============================================================================

/**
 * Main test harness interface exposed on `window.__gameTest`.
 *
 * GameTestHarness provides comprehensive E2E testing capabilities:
 * - Game readiness detection
 * - Error capture and reporting
 * - ECS entity inspection
 * - Render state snapshots
 * - Input simulation
 * - Scene control (pause/resume/tick)
 *
 * @example
 * // Basic E2E test pattern
 * test('game loads and renders', async ({ page }) => {
 *   await page.goto('/?testMode');
 *
 *   // Wait for game ready
 *   await page.waitForFunction(
 *     () => window.__gameTest?.ready === true,
 *     { timeout: 10000 }
 *   );
 *
 *   // Verify no errors
 *   const errors = await page.evaluate(() => window.__gameTest?.errors);
 *   expect(errors).toHaveLength(0);
 *
 *   // Verify entities exist
 *   const entityCount = await page.evaluate(() =>
 *     window.__gameTest?.ecs.getEntityCount()
 *   );
 *   expect(entityCount).toBeGreaterThan(0);
 * });
 *
 * @example
 * // Test interaction
 * test('clicking square changes color', async ({ page }) => {
 *   await page.goto('/?testMode');
 *   await page.waitForFunction(() => window.__gameTest?.ready);
 *
 *   // Get initial state
 *   const before = await page.evaluate(() =>
 *     window.__gameTest?.ecs.queryByComponent('testSquare')[0]
 *   );
 *   expect(before?.components.testSquare).toHaveProperty('color', 0xff0000);
 *
 *   // Click the square
 *   await page.click('canvas');
 *
 *   // Verify color changed
 *   const after = await page.evaluate(() =>
 *     window.__gameTest?.ecs.queryByComponent('testSquare')[0]
 *   );
 *   expect(after?.components.testSquare).toHaveProperty('color', 0x00ff00);
 * });
 *
 * @example
 * // Check boot performance
 * test('game boots in under 3 seconds', async ({ page }) => {
 *   await page.goto('/?testMode');
 *   await page.waitForFunction(() => window.__gameTest?.ready);
 *
 *   const snapshot = await page.evaluate(() => window.__gameTest?.snapshot());
 *   expect(snapshot?.bootTimeMs).toBeLessThan(3000);
 * });
 */
export interface GameTestHarness {
  /** True when game is fully initialized and ready for testing */
  ready: boolean;
  /** Current scene/screen name */
  scene: string;
  /** Timestamp when harness was created (ms since page load) */
  bootStartTime: number;
  /** Timestamp when markReady was called (ms since page load) */
  bootEndTime?: number | undefined;
  /** Array of all captured errors */
  errors: GameTestError[];
  /** Performance metrics (fps, draw calls, etc.) */
  metrics: GameTestMetrics;

  /** ECS access layer for querying entities and components */
  ecs: ECSAccess;

  /**
   * Mark the game as ready for testing.
   * Called automatically by bootstrap when initialization completes.
   */
  markReady(scene: string): void;

  /**
   * Capture an error for later inspection in tests.
   * Also automatically captures window errors and unhandled rejections.
   */
  captureError(error: Error | string, source?: string): void;

  /**
   * Get a snapshot of current harness state.
   * Useful for logging or debugging test failures.
   */
  snapshot(): {
    ready: boolean;
    scene: string;
    errors: GameTestError[];
    bootTimeMs?: number | undefined;
  };

  /**
   * Register an ODIE Scene2D for ECS access.
   * Called automatically by GameScene during initialization.
   */
  registerScene(scene: unknown): void;

  /**
   * Execute a single test action and return the result.
   * @see TestAction for available action types
   */
  act(action: TestAction): Promise<ActionResult>;

  /**
   * Execute multiple test actions in sequence.
   * Actions are executed one at a time, waiting for each to complete.
   */
  actMany(actions: TestAction[]): Promise<ActionResult[]>;

  /**
   * Get a deterministic snapshot of the current render state.
   * Includes all entities and a hash for quick comparisons.
   */
  getRenderSignature(): RenderSignature;

  /**
   * Access to the game tick counter for deterministic logging and replay.
   * Use tick.current to get the current frame number.
   */
  tick: TickAccess;
}

// ============================================================================
// Tick Counter Access
// ============================================================================

/**
 * Interface for accessing the game tick counter.
 *
 * The tick counter provides frame-based timing for deterministic debug logging
 * and replay capabilities. Each tick corresponds to one frame of game logic.
 *
 * @example
 * // Get current tick in E2E test
 * const tick = await page.evaluate(() => window.__gameTest?.tick.current);
 *
 * @example
 * // Reset tick counter for deterministic testing
 * await page.evaluate(() => window.__gameTest?.tick.reset());
 */
export interface TickAccess {
  /** Get the current tick number */
  readonly current: number;
  /** Reset the tick counter to zero */
  reset(): void;
  /** Enable or disable tick-based logging */
  setLoggingEnabled(enabled: boolean): void;
}

/**
 * Global window interface extension for the test harness.
 *
 * The harness is only available when running in dev mode or when
 * the `testMode` URL parameter is present.
 */
declare global {
  interface Window {
    /** Game test harness for E2E testing (dev/test mode only) */
    __gameTest?: GameTestHarness;
  }
}
