/**
 * Astro screen implementations.
 *
 * Screens are the main UI containers in an Astro application.
 * They have lifecycle hooks (prepare, show, hide, hidden) and
 * manage their own display containers.
 *
 * @example
 * import { GameScreen, LoadingScreen, BaseScreen } from '@ui/screens';
 *
 * @module
 */

export { BaseScreen } from './BaseScreen';
export { GameScreen } from './GameScreen';
export { LoadingScreen } from './LoadingScreen';
