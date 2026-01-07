/**
 * Action DSL Executor for Test Harness
 *
 * This module implements the action execution system that allows E2E tests
 * to manipulate game state and simulate user input. Actions are declarative
 * objects that describe what should happen.
 *
 * Supported action types:
 * - Entity manipulation: setPosition, setComponent, setVisible, destroyEntity
 * - Scene control: pause, resume, tick
 * - Input simulation: pointerDown, pointerUp, pointerMove, keyDown, keyUp
 * - Timing: wait
 *
 * @example
 * // Move an entity and wait
 * await harness.actMany([
 *   { type: 'setPosition', entityId: '123', x: 100, y: 200 },
 *   { type: 'wait', ms: 100 }
 * ]);
 *
 * @module
 */

import type { TestAction, ActionResult } from '../types';

/**
 * Finds an entity by ID in the ODIE scene.
 *
 * Searches scene.allEntities.children for an entity matching the ID.
 * Handles both string and numeric IDs.
 *
 * @param scene - ODIE Scene2D instance
 * @param entityId - Entity ID to find
 * @returns Entity or null if not found
 */
function findEntity(scene: unknown, entityId: string | number): unknown {
  const s = scene as { allEntities?: { children?: unknown[] } };
  const entities = s.allEntities?.children ?? [];

  // Normalize to string for comparison
  const targetId =
    typeof entityId === 'number' ? entityId.toString() : entityId;

  return (
    entities.find((e: unknown) => {
      const entity = e as { UID?: string | number; uid?: string };
      const id = entity.UID ?? entity.uid;
      const idStr = typeof id === 'number' ? id.toString() : id;
      return idStr === targetId;
    }) ?? null
  );
}

/**
 * Execute setPosition action
 */
function executeSetPosition(
  scene: unknown,
  entityId: string,
  x: number,
  y: number
): ActionResult {
  if (!scene) return { success: false, error: 'Scene not available' };

  const entity = findEntity(scene, entityId);
  if (!entity) return { success: false, error: `Entity ${entityId} not found` };

  const e = entity as { position?: { set: (x: number, y: number) => void } };
  if (e.position?.set) {
    e.position.set(x, y);
    return { success: true };
  }

  return { success: false, error: 'Entity has no position property' };
}

/**
 * Execute setComponent action
 * ODIE stores components in entity.c property as plain object
 */
function executeSetComponent(
  scene: unknown,
  entityId: string,
  componentName: string,
  data: Record<string, unknown>
): ActionResult {
  if (!scene) return { success: false, error: 'Scene not available' };

  const entity = findEntity(scene, entityId);
  if (!entity) return { success: false, error: `Entity ${entityId} not found` };

  // ODIE uses 'c' property for components as plain object
  const e = entity as {
    c?: Record<string, unknown>;
    components?: Map<string, unknown>;
  };

  const componentSource = e.c ?? e.components;
  if (!componentSource) {
    return { success: false, error: 'Entity has no components' };
  }

  // Handle both Map and plain object
  let component: unknown;
  if (componentSource instanceof Map) {
    component = componentSource.get(componentName);
  } else {
    component = componentSource[componentName];
  }

  if (!component) {
    return { success: false, error: `Component ${componentName} not found` };
  }

  // Apply data to component
  Object.assign(component, data);
  return { success: true };
}

/**
 * Execute setVisible action
 */
function executeSetVisible(
  scene: unknown,
  entityId: string,
  visible: boolean
): ActionResult {
  if (!scene) return { success: false, error: 'Scene not available' };

  const entity = findEntity(scene, entityId);
  if (!entity) return { success: false, error: `Entity ${entityId} not found` };

  (entity as { visible?: boolean }).visible = visible;
  return { success: true };
}

/**
 * Execute destroyEntity action
 */
function executeDestroyEntity(scene: unknown, entityId: string): ActionResult {
  if (!scene) return { success: false, error: 'Scene not available' };

  const entity = findEntity(scene, entityId);
  if (!entity) return { success: false, error: `Entity ${entityId} not found` };

  const s = scene as { removeChild?: (entity: unknown) => void };
  if (s.removeChild) {
    s.removeChild(entity);
    return { success: true };
  }

  return { success: false, error: 'Scene has no removeChild method' };
}

/**
 * Execute pause action
 */
function executePause(scene: unknown): ActionResult {
  if (!scene) return { success: false, error: 'Scene not available' };
  (scene as { paused?: boolean }).paused = true;
  return { success: true };
}

/**
 * Execute resume action
 */
function executeResume(scene: unknown): ActionResult {
  if (!scene) return { success: false, error: 'Scene not available' };
  (scene as { paused?: boolean }).paused = false;
  return { success: true };
}

/**
 * Execute tick action - manually advance scene update
 */
function executeTick(scene: unknown, deltaMs: number): ActionResult {
  if (!scene) return { success: false, error: 'Scene not available' };

  const s = scene as { update?: (delta: number) => void };
  if (s.update) {
    s.update(deltaMs);
    return { success: true };
  }

  return { success: false, error: 'Scene has no update method' };
}

/**
 * Execute pointer event action
 */
function executePointerEvent(
  eventType: 'pointerdown' | 'pointerup' | 'pointermove',
  canvas: HTMLCanvasElement | null,
  x: number,
  y: number,
  button?: number
): ActionResult {
  if (!canvas) return { success: false, error: 'Canvas not available' };

  const rect = canvas.getBoundingClientRect();
  const event = new PointerEvent(eventType, {
    bubbles: true,
    cancelable: true,
    clientX: rect.left + x,
    clientY: rect.top + y,
    button: button ?? 0,
    pointerType: 'mouse',
  });

  canvas.dispatchEvent(event);
  return { success: true };
}

/**
 * Execute keyboard event action
 */
function executeKeyEvent(
  eventType: 'keydown' | 'keyup',
  key: string,
  code: string
): ActionResult {
  const event = new KeyboardEvent(eventType, {
    bubbles: true,
    cancelable: true,
    key,
    code,
  });

  window.dispatchEvent(event);
  return { success: true };
}

/**
 * Creates an action executor function for the test harness.
 *
 * The executor handles all TestAction types, executing them against
 * the scene and canvas. Each action returns an ActionResult indicating
 * success or failure.
 *
 * @param getScene - Function that returns the ODIE scene
 * @param getCanvas - Function that returns the game canvas element
 * @returns Async function that executes TestActions
 *
 * @example
 * const executeAction = createActionExecutor(
 *   () => ecsAccess.getScene(),
 *   () => document.querySelector('canvas')
 * );
 *
 * const result = await executeAction({ type: 'pause' });
 * if (!result.success) {
 *   console.error('Failed:', result.error);
 * }
 */
export function createActionExecutor(
  getScene: () => unknown,
  getCanvas: () => HTMLCanvasElement | null
): (action: TestAction) => Promise<ActionResult> {
  return async (action: TestAction): Promise<ActionResult> => {
    try {
      switch (action.type) {
        case 'setPosition':
          return executeSetPosition(
            getScene(),
            action.entityId,
            action.x,
            action.y
          );

        case 'setComponent':
          return executeSetComponent(
            getScene(),
            action.entityId,
            action.component,
            action.data
          );

        case 'setVisible':
          return executeSetVisible(getScene(), action.entityId, action.visible);

        case 'destroyEntity':
          return executeDestroyEntity(getScene(), action.entityId);

        case 'pause':
          return executePause(getScene());

        case 'resume':
          return executeResume(getScene());

        case 'tick':
          return executeTick(getScene(), action.deltaMs);

        case 'pointerDown':
          return executePointerEvent(
            'pointerdown',
            getCanvas(),
            action.x,
            action.y,
            action.button
          );

        case 'pointerUp':
          return executePointerEvent(
            'pointerup',
            getCanvas(),
            action.x,
            action.y,
            action.button
          );

        case 'pointerMove':
          return executePointerEvent(
            'pointermove',
            getCanvas(),
            action.x,
            action.y,
            0
          );

        case 'keyDown':
          return executeKeyEvent('keydown', action.key, action.code);

        case 'keyUp':
          return executeKeyEvent('keyup', action.key, action.code);

        case 'wait':
          await new Promise((resolve) => setTimeout(resolve, action.ms));
          return { success: true };

        default: {
          const exhaustiveCheck: never = action;
          return {
            success: false,
            error: `Unknown action type: ${(exhaustiveCheck as { type: string }).type}`,
          };
        }
      }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  };
}
