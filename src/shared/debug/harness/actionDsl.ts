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
 * @param scene - ODIE Scene2D instance
 * @param entityId - Entity ID to find
 * @returns Entity or null if not found
 *
 * @example
 * const entity = findEntity(scene, '123');
 */
function findEntity(scene: unknown, entityId: string | number): unknown {
  const s = scene as { allEntities?: { children?: unknown[] } };
  const entities = s.allEntities?.children ?? [];
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
 * Gets a component from an entity by name.
 *
 * @param entity - The entity to query
 * @param componentName - Name of the component
 * @returns The component or null if not found
 *
 * @example
 * const health = getEntityComponent(entity, 'health');
 */
function getEntityComponent(entity: unknown, componentName: string): unknown {
  const e = entity as {
    c?: Record<string, unknown>;
    components?: Map<string, unknown>;
  };
  const source = e.c ?? e.components;
  if (!source) {
    return null;
  }
  if (source instanceof Map) {
    return source.get(componentName) ?? null;
  }
  return source[componentName] ?? null;
}

/**
 * Executes a setPosition action on an entity.
 *
 * @param scene - The ODIE scene
 * @param entityId - Target entity ID
 * @param x - New X position
 * @param y - New Y position
 * @returns Action result indicating success or failure
 *
 * @example
 * executeSetPosition(scene, '123', 100, 200);
 */
function executeSetPosition(
  scene: unknown,
  entityId: string,
  x: number,
  y: number
): ActionResult {
  if (!scene) {
    return { success: false, error: 'Scene not available' };
  }
  const entity = findEntity(scene, entityId);
  if (!entity) {
    return { success: false, error: `Entity ${entityId} not found` };
  }
  const e = entity as { position?: { set: (x: number, y: number) => void } };
  if (!e.position?.set) {
    return { success: false, error: 'Entity has no position property' };
  }
  e.position.set(x, y);
  return { success: true };
}

/**
 * Executes a setComponent action to update component data.
 *
 * @param scene - The ODIE scene
 * @param entityId - Target entity ID
 * @param componentName - Name of the component to update
 * @param data - Data to merge into the component
 * @returns Action result indicating success or failure
 *
 * @example
 * executeSetComponent(scene, '123', 'health', { current: 50 });
 */
function executeSetComponent(
  scene: unknown,
  entityId: string,
  componentName: string,
  data: Record<string, unknown>
): ActionResult {
  if (!scene) {
    return { success: false, error: 'Scene not available' };
  }
  const entity = findEntity(scene, entityId);
  if (!entity) {
    return { success: false, error: `Entity ${entityId} not found` };
  }
  const component = getEntityComponent(entity, componentName);
  if (!component) {
    return { success: false, error: `Component ${componentName} not found` };
  }
  Object.assign(component, data);
  return { success: true };
}

/**
 * Executes a setVisible action on an entity.
 *
 * @param scene - The ODIE scene
 * @param entityId - Target entity ID
 * @param visible - New visibility state
 * @returns Action result indicating success or failure
 *
 * @example
 * executeSetVisible(scene, '123', false);
 */
function executeSetVisible(
  scene: unknown,
  entityId: string,
  visible: boolean
): ActionResult {
  if (!scene) {
    return { success: false, error: 'Scene not available' };
  }
  const entity = findEntity(scene, entityId);
  if (!entity) {
    return { success: false, error: `Entity ${entityId} not found` };
  }
  (entity as { visible?: boolean }).visible = visible;
  return { success: true };
}

/**
 * Executes a destroyEntity action.
 *
 * @param scene - The ODIE scene
 * @param entityId - Target entity ID to destroy
 * @returns Action result indicating success or failure
 *
 * @example
 * executeDestroyEntity(scene, '123');
 */
function executeDestroyEntity(scene: unknown, entityId: string): ActionResult {
  if (!scene) {
    return { success: false, error: 'Scene not available' };
  }
  const entity = findEntity(scene, entityId);
  if (!entity) {
    return { success: false, error: `Entity ${entityId} not found` };
  }
  const s = scene as { removeChild?: (entity: unknown) => void };
  if (!s.removeChild) {
    return { success: false, error: 'Scene has no removeChild method' };
  }
  s.removeChild(entity);
  return { success: true };
}

/**
 * Executes a pause action on the scene.
 *
 * @param scene - The ODIE scene to pause
 * @returns Action result indicating success or failure
 *
 * @example
 * executePause(scene);
 */
function executePause(scene: unknown): ActionResult {
  if (!scene) {
    return { success: false, error: 'Scene not available' };
  }
  (scene as { paused?: boolean }).paused = true;
  return { success: true };
}

/**
 * Executes a resume action on the scene.
 *
 * @param scene - The ODIE scene to resume
 * @returns Action result indicating success or failure
 *
 * @example
 * executeResume(scene);
 */
function executeResume(scene: unknown): ActionResult {
  if (!scene) {
    return { success: false, error: 'Scene not available' };
  }
  (scene as { paused?: boolean }).paused = false;
  return { success: true };
}

/**
 * Executes a tick action to manually advance the scene.
 *
 * @param scene - The ODIE scene
 * @param deltaMs - Time delta in milliseconds
 * @returns Action result indicating success or failure
 *
 * @example
 * executeTick(scene, 16.67);
 */
function executeTick(scene: unknown, deltaMs: number): ActionResult {
  if (!scene) {
    return { success: false, error: 'Scene not available' };
  }
  const s = scene as { update?: (delta: number) => void };
  if (!s.update) {
    return { success: false, error: 'Scene has no update method' };
  }
  s.update(deltaMs);
  return { success: true };
}

/**
 * Executes a pointer event on the canvas.
 *
 * @param eventType - Type of pointer event
 * @param canvas - Target canvas element
 * @param x - X coordinate relative to canvas
 * @param y - Y coordinate relative to canvas
 * @param button - Mouse button (default 0)
 * @returns Action result indicating success or failure
 *
 * @example
 * executePointerEvent('pointerdown', canvas, 100, 200, 0);
 */
function executePointerEvent(
  eventType: 'pointerdown' | 'pointerup' | 'pointermove',
  canvas: HTMLCanvasElement | null,
  x: number,
  y: number,
  button?: number
): ActionResult {
  if (!canvas) {
    return { success: false, error: 'Canvas not available' };
  }
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
 * Executes a keyboard event.
 *
 * @param eventType - Type of keyboard event
 * @param key - The key value
 * @param code - The key code
 * @returns Action result indicating success or failure
 *
 * @example
 * executeKeyEvent('keydown', ' ', 'Space');
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
 * Dispatches entity-related actions.
 *
 * @param action - The entity action to dispatch
 * @param scene - The current scene
 * @returns Action result or null if not an entity action
 *
 * @example
 * const result = dispatchEntityAction(action, scene);
 */
function dispatchEntityAction(
  action: TestAction,
  scene: unknown
): ActionResult | null {
  switch (action.type) {
    case 'setPosition':
      return executeSetPosition(scene, action.entityId, action.x, action.y);
    case 'setComponent':
      return executeSetComponent(
        scene,
        action.entityId,
        action.component,
        action.data
      );
    case 'setVisible':
      return executeSetVisible(scene, action.entityId, action.visible);
    case 'destroyEntity':
      return executeDestroyEntity(scene, action.entityId);
    case 'pause':
      return executePause(scene);
    case 'resume':
      return executeResume(scene);
    case 'tick':
      return executeTick(scene, action.deltaMs);
    default:
      return null;
  }
}

/**
 * Dispatches pointer actions to the canvas.
 *
 * @param action - The pointer action
 * @param canvas - The canvas element
 * @returns Action result or null if not a pointer action
 * @internal
 */
function dispatchPointerAction(
  action: TestAction,
  canvas: HTMLCanvasElement | null
): ActionResult | null {
  switch (action.type) {
    case 'pointerDown':
      return executePointerEvent(
        'pointerdown',
        canvas,
        action.x,
        action.y,
        action.button
      );
    case 'pointerUp':
      return executePointerEvent(
        'pointerup',
        canvas,
        action.x,
        action.y,
        action.button
      );
    case 'pointerMove':
      return executePointerEvent('pointermove', canvas, action.x, action.y, 0);
    default:
      return null;
  }
}

/**
 * Dispatches input-related actions.
 *
 * @param action - The input action to dispatch
 * @param canvas - The canvas element
 * @returns Action result or null if not an input action
 *
 * @example
 * const result = await dispatchInputAction(action, canvas);
 */
async function dispatchInputAction(
  action: TestAction,
  canvas: HTMLCanvasElement | null
): Promise<ActionResult | null> {
  const pointerResult = dispatchPointerAction(action, canvas);
  if (pointerResult) {
    return pointerResult;
  }
  switch (action.type) {
    case 'keyDown':
      return executeKeyEvent('keydown', action.key, action.code);
    case 'keyUp':
      return executeKeyEvent('keyup', action.key, action.code);
    case 'wait':
      await new Promise((resolve) => setTimeout(resolve, action.ms));
      return { success: true };
    default:
      return null;
  }
}

/**
 * Dispatches an action to the appropriate executor.
 *
 * @param action - The action to dispatch
 * @param getScene - Function to get the current scene
 * @param getCanvas - Function to get the canvas element
 * @returns Promise resolving to action result
 *
 * @example
 * const result = await dispatchAction(action, getScene, getCanvas);
 */
async function dispatchAction(
  action: TestAction,
  getScene: () => unknown,
  getCanvas: () => HTMLCanvasElement | null
): Promise<ActionResult> {
  const entityResult = dispatchEntityAction(action, getScene());
  if (entityResult) {
    return entityResult;
  }
  const inputResult = await dispatchInputAction(action, getCanvas());
  if (inputResult) {
    return inputResult;
  }
  return { success: false, error: `Unknown action type: ${action.type}` };
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
      return await dispatchAction(action, getScene, getCanvas);
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  };
}
