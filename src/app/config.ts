/**
 * Application configuration constants.
 *
 * These values configure the game's display settings and are used during
 * bootstrap. The configuration is immutable (defined with `as const`).
 *
 * @property width - Canvas width in pixels (default: 1080)
 * @property height - Canvas height in pixels (default: 1920)
 * @property backgroundColor - Background color as hex number (default: 0x1a1a2e - dark blue)
 * @property antialias - Enable antialiasing for smoother graphics (default: true)
 *
 * @example
 * // Centering an entity on screen
 * import { APP_CONFIG } from '@app';
 *
 * entity.position.set(
 *   APP_CONFIG.width / 2,
 *   APP_CONFIG.height / 2
 * );
 *
 * @example
 * // Creating a full-screen background
 * import { APP_CONFIG } from '@app';
 * import { Graphics } from 'pixi.js';
 *
 * const bg = new Graphics();
 * bg.rect(0, 0, APP_CONFIG.width, APP_CONFIG.height);
 * bg.fill({ color: APP_CONFIG.backgroundColor });
 *
 * @example
 * // Using in resize calculations
 * import { APP_CONFIG } from '@app';
 *
 * const aspectRatio = APP_CONFIG.width / APP_CONFIG.height;
 * const scale = Math.min(
 *   window.innerWidth / APP_CONFIG.width,
 *   window.innerHeight / APP_CONFIG.height
 * );
 */
export const APP_CONFIG = {
  width: 1080,
  height: 1920,
  backgroundColor: 0x1a1a2e,
  antialias: true,
} as const;

/**
 * Type representing the application configuration shape.
 *
 * Use this type when you need to accept or pass configuration values
 * that match the APP_CONFIG structure.
 *
 * @example
 * import type { AppConfig } from '@app';
 *
 * function logConfig(config: AppConfig): void {
 *   console.log(`Game size: ${config.width}x${config.height}`);
 * }
 */
export type AppConfig = typeof APP_CONFIG;
