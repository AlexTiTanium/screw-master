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
