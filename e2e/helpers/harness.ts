import type { Page } from '@playwright/test';

/**
 * Types mirroring the game's test harness types
 * These are duplicated to avoid import issues between e2e and src
 */

export interface EntitySnapshot {
  id: string | number;
  type: string;
  position: { x: number; y: number };
  scale: { x: number; y: number };
  rotation: number;
  visible: boolean;
  alpha: number;
  bounds: { x: number; y: number; width: number; height: number } | null;
  components: Record<string, unknown>;
  childCount: number;
}

export interface RenderSignature {
  timestamp: number;
  frame: number;
  entityCount: number;
  entities: EntitySnapshot[];
  systems: string[];
  sceneState: 'running' | 'paused' | 'stopped';
  hash: string;
}

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

export interface ActionResult {
  success: boolean;
  error?: string;
  data?: unknown;
}

export interface GameTestSnapshot {
  ready: boolean;
  scene: string;
  errors: { message: string; stack?: string; timestamp: number }[];
  bootTimeMs?: number;
}

/**
 * Type-safe client for interacting with the game test harness from Playwright
 */
export interface HarnessClient {
  /** Wait for game to signal ready */
  waitForReady(timeout?: number): Promise<void>;

  /** Execute a single test action */
  act(action: TestAction): Promise<ActionResult>;

  /** Execute multiple test actions in sequence */
  actMany(actions: TestAction[]): Promise<ActionResult[]>;

  /** Get current render signature */
  getRenderSignature(): Promise<RenderSignature>;

  /** Get all entities in the scene */
  getEntities(): Promise<EntitySnapshot[]>;

  /** Get entity by ID */
  getEntity(id: string): Promise<EntitySnapshot | null>;

  /** Query entities by component name */
  queryByComponent(componentName: string): Promise<EntitySnapshot[]>;

  /** Get entity count */
  getEntityCount(): Promise<number>;

  /** Check if entity exists */
  hasEntity(id: string): Promise<boolean>;

  /** Get captured errors from harness */
  getErrors(): Promise<string[]>;

  /** Get current game state snapshot */
  snapshot(): Promise<GameTestSnapshot>;
}

// Window type for page evaluation
interface WindowWithHarness {
  __gameTest?: {
    ready: boolean;
    errors: { message: string }[];
    act: (action: TestAction) => Promise<ActionResult>;
    actMany: (actions: TestAction[]) => Promise<ActionResult[]>;
    getRenderSignature: () => RenderSignature;
    snapshot: () => GameTestSnapshot;
    ecs: {
      getEntities: () => EntitySnapshot[];
      getEntity: (id: string) => EntitySnapshot | null;
      queryByComponent: (name: string) => EntitySnapshot[];
      getEntityCount: () => number;
      hasEntity: (id: string) => boolean;
    };
  };
}

/**
 * Create a harness client for interacting with the game test harness
 */
export function createHarnessClient(page: Page): HarnessClient {
  return {
    async waitForReady(timeout = 10000): Promise<void> {
      await page.waitForFunction(
        () =>
          (window as unknown as WindowWithHarness).__gameTest?.ready === true,
        { timeout }
      );
    },

    async act(action: TestAction): Promise<ActionResult> {
      return page.evaluate((a) => {
        const harness = (window as unknown as WindowWithHarness).__gameTest;
        if (!harness) throw new Error('Test harness not found');
        return harness.act(a);
      }, action);
    },

    async actMany(actions: TestAction[]): Promise<ActionResult[]> {
      return page.evaluate((a) => {
        const harness = (window as unknown as WindowWithHarness).__gameTest;
        if (!harness) throw new Error('Test harness not found');
        return harness.actMany(a);
      }, actions);
    },

    async getRenderSignature(): Promise<RenderSignature> {
      return page.evaluate(() => {
        const harness = (window as unknown as WindowWithHarness).__gameTest;
        if (!harness) throw new Error('Test harness not found');
        return harness.getRenderSignature();
      });
    },

    async getEntities(): Promise<EntitySnapshot[]> {
      return page.evaluate(() => {
        const harness = (window as unknown as WindowWithHarness).__gameTest;
        if (!harness) throw new Error('Test harness not found');
        return harness.ecs.getEntities();
      });
    },

    async getEntity(id: string): Promise<EntitySnapshot | null> {
      return page.evaluate((entityId) => {
        const harness = (window as unknown as WindowWithHarness).__gameTest;
        if (!harness) throw new Error('Test harness not found');
        return harness.ecs.getEntity(entityId);
      }, id);
    },

    async queryByComponent(componentName: string): Promise<EntitySnapshot[]> {
      return page.evaluate((name) => {
        const harness = (window as unknown as WindowWithHarness).__gameTest;
        if (!harness) throw new Error('Test harness not found');
        return harness.ecs.queryByComponent(name);
      }, componentName);
    },

    async getEntityCount(): Promise<number> {
      return page.evaluate(() => {
        const harness = (window as unknown as WindowWithHarness).__gameTest;
        if (!harness) throw new Error('Test harness not found');
        return harness.ecs.getEntityCount();
      });
    },

    async hasEntity(id: string): Promise<boolean> {
      return page.evaluate((entityId) => {
        const harness = (window as unknown as WindowWithHarness).__gameTest;
        if (!harness) throw new Error('Test harness not found');
        return harness.ecs.hasEntity(entityId);
      }, id);
    },

    async getErrors(): Promise<string[]> {
      return page.evaluate(() => {
        const harness = (window as unknown as WindowWithHarness).__gameTest;
        if (!harness) throw new Error('Test harness not found');
        return harness.errors.map((e) => e.message);
      });
    },

    async snapshot(): Promise<GameTestSnapshot> {
      return page.evaluate(() => {
        const harness = (window as unknown as WindowWithHarness).__gameTest;
        if (!harness) throw new Error('Test harness not found');
        return harness.snapshot();
      });
    },
  };
}

/**
 * Convenience function to create a harness client
 */
export function withHarness(page: Page): HarnessClient {
  return createHarnessClient(page);
}

/**
 * Wait for a condition to be true, polling the game state.
 * More reliable than fixed timeouts for CI environments.
 */
export async function waitForCondition(
  page: Page,
  condition: () => Promise<boolean>,
  options: { timeout?: number; interval?: number; message?: string } = {}
): Promise<void> {
  const { timeout = 5000, interval = 100, message = 'Condition not met' } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await page.waitForTimeout(interval);
  }

  throw new Error(`${message} (timeout: ${String(timeout)}ms)`);
}

/**
 * Wait for a screw to reach a specific state.
 */
export async function waitForScrewState(
  harness: HarnessClient,
  page: Page,
  screwColor: string,
  targetState: 'inBoard' | 'inTray' | 'inBuffer',
  options: { timeout?: number; count?: number } = {}
): Promise<void> {
  const { timeout = 5000, count = 1 } = options;

  await waitForCondition(
    page,
    async () => {
      const screws = await harness.queryByComponent('screw');
      const matchingScrews = screws.filter((s) => {
        const sc = s.components.screw as { color?: string; state?: string };
        return sc.color === screwColor && sc.state === targetState;
      });
      return matchingScrews.length >= count;
    },
    { timeout, message: `Expected ${String(count)} ${screwColor} screw(s) in state ${targetState}` }
  );
}

/**
 * Wait for tray to have specific screw count.
 */
export async function waitForTrayState(
  harness: HarnessClient,
  page: Page,
  trayColor: string,
  expectedScrewCount: number,
  options: { timeout?: number } = {}
): Promise<void> {
  const { timeout = 5000 } = options;

  await waitForCondition(
    page,
    async () => {
      const trays = await harness.queryByComponent('tray');
      const tray = trays.find((t) => {
        const tc = t.components.tray as { color?: string; isBuffer?: boolean };
        return tc.color === trayColor && !tc.isBuffer;
      });
      if (!tray) return false;
      const tc = tray.components.tray as { screwCount?: number };
      return (tc.screwCount ?? 0) === expectedScrewCount;
    },
    { timeout, message: `Expected ${trayColor} tray to have ${String(expectedScrewCount)} screws` }
  );
}

/**
 * Wait for buffer tray to have specific number of screws.
 */
export async function waitForBufferState(
  harness: HarnessClient,
  page: Page,
  expectedCount: number,
  options: { timeout?: number } = {}
): Promise<void> {
  const { timeout = 5000 } = options;

  await waitForCondition(
    page,
    async () => {
      const bufferTrays = await harness.queryByComponent('bufferTray');
      if (bufferTrays.length === 0) return false;
      const buffer = bufferTrays[0]!;
      const bc = buffer.components.bufferTray as { screwIds?: string[] };
      return (bc.screwIds?.length ?? 0) === expectedCount;
    },
    { timeout, message: `Expected buffer to have ${String(expectedCount)} screws` }
  );
}

/**
 * Wait for animations to settle (no position changes for a period).
 */
export async function waitForAnimationsToSettle(
  harness: HarnessClient,
  page: Page,
  options: { timeout?: number; stableTime?: number } = {}
): Promise<void> {
  const { timeout = 5000, stableTime = 200 } = options;
  const startTime = Date.now();
  let lastPositions = new Map<string | number, { x: number; y: number }>();
  let stableSince = 0;

  while (Date.now() - startTime < timeout) {
    const entities = await harness.getEntities();
    const currentPositions = new Map(
      entities.map((e) => [e.id, { x: e.position.x, y: e.position.y }])
    );

    let allStable = true;
    for (const [id, pos] of currentPositions) {
      const lastPos = lastPositions.get(id);
      if (lastPos && (Math.abs(pos.x - lastPos.x) > 1 || Math.abs(pos.y - lastPos.y) > 1)) {
        allStable = false;
        break;
      }
    }

    if (allStable && lastPositions.size > 0) {
      if (stableSince === 0) {
        stableSince = Date.now();
      } else if (Date.now() - stableSince >= stableTime) {
        return;
      }
    } else {
      stableSince = 0;
    }

    lastPositions = currentPositions;
    await page.waitForTimeout(50);
  }
}
