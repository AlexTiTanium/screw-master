/**
 * Test Harness Implementation
 *
 * This module contains the internal implementation of the test harness,
 * including ECS access, render signature generation, and action execution.
 *
 * These are internal APIs used by the main harness; prefer using the
 * public API from `@shared/debug` in application code.
 *
 * @example
 * // These are internal APIs - use the public harness instead
 * import { initTestHarness, markGameReady } from '@shared/debug';
 *
 * @module
 */

export { createECSAccess, type ECSAccessInternal } from './ecsAccess';
export {
  createRenderSignatureGenerator,
  resetFrameCounter,
} from './renderSignature';
export { createActionExecutor } from './actionDsl';
