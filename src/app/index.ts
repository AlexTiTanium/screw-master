/**
 * Application Bootstrap Module
 *
 * Provides the main application entry point and configuration.
 *
 * @example
 * import { bootstrap, getApp, APP_CONFIG } from '@app';
 *
 * // Start the application
 * await bootstrap();
 *
 * // Access the running Astro Application
 * const app = getApp();
 *
 * @module
 */

export { bootstrap, getApp } from './bootstrap';
export { APP_CONFIG } from './config';
export type { AppConfig } from './config';
