/**
 * Application bootstrap module.
 *
 * This module initializes and configures the Astro application with all
 * necessary plugins and the initial game screen.
 *
 * @module
 */

import {
  Application,
  StagePlugin,
  ResizePlugin,
  ScreensPlugin,
  KeyboardPlugin,
  ResourcePlugin,
  gameResize,
} from '@play-co/astro';

import { GameScreen } from '@ui/screens/GameScreen';
import { markGameReady } from '@shared/debug';

import { APP_CONFIG } from './config';

/** Singleton application instance */
let app: Application | null = null;

/**
 * Initializes and starts the game application.
 *
 * This function performs the following setup:
 * 1. Creates the Astro Application instance
 * 2. Configures core plugins:
 *    - **StagePlugin** - PixiJS renderer and canvas management
 *    - **ResizePlugin** - Responsive viewport scaling
 *    - **ResourcePlugin** - Asset loading via PixiJS Assets
 *    - **KeyboardPlugin** - Keyboard input handling
 *    - **ScreensPlugin** - Screen management with main/overlay layers
 * 3. Mounts the canvas to the DOM (#app element)
 * 4. Shows the initial GameScreen
 * 5. Marks the game as ready for the test harness
 *
 * The function is idempotent - calling it multiple times returns the
 * same Application instance.
 *
 * @returns A promise resolving to the initialized Application instance
 * @throws {Error} If the app container element (#app) is not found in the DOM
 *
 * @example
 * // Basic usage in main.ts
 * import { bootstrap } from '@app';
 *
 * async function main(): Promise<void> {
 *   const app = await bootstrap();
 *   console.log('Game started!');
 * }
 *
 * main().catch(console.error);
 *
 * @example
 * // Accessing plugins after bootstrap
 * import { bootstrap, getApp } from '@app';
 * import { ScreensPlugin, KeyboardPlugin } from '@play-co/astro';
 *
 * await bootstrap();
 *
 * const app = getApp();
 * if (app) {
 *   // Access screen management
 *   const screens = app.get(ScreensPlugin);
 *   await screens.main.show('menu');
 *
 *   // Bind keyboard controls
 *   const keyboard = app.get(KeyboardPlugin);
 *   keyboard.bindKeyDown('Space', () => {
 *     console.log('Space pressed!');
 *   });
 * }
 *
 * @example
 * // Using ResourcePlugin for asset loading
 * import { getApp } from '@app';
 * import { ResourcePlugin } from '@play-co/astro';
 * import { Assets } from 'pixi.js';
 *
 * const app = getApp();
 * if (app) {
 *   // ResourcePlugin initializes PixiJS Assets automatically
 *   const texture = await Assets.load('images/player.png');
 * }
 */
export async function bootstrap(): Promise<Application> {
  if (app !== null) {
    return app;
  }

  app = new Application();

  configurePlugins(app);
  await app.init();
  mountToDOM(app);
  await showInitialScreen(app);

  return app;
}

/**
 * Configures all core plugins for the application.
 *
 * @param application - The Astro Application instance to configure
 *
 * @example
 * const app = new Application();
 * configurePlugins(app);
 */
function configurePlugins(application: Application): void {
  application.add(StagePlugin, {
    backgroundColor: APP_CONFIG.backgroundColor,
    antialias: APP_CONFIG.antialias,
    autoAddToDocument: false,
  });

  application.add(ResizePlugin, {
    resizeFunction: gameResize(APP_CONFIG.width, APP_CONFIG.height),
  });

  application.add(ResourcePlugin);
  application.add(KeyboardPlugin);

  // Note: Using type assertion because Application.add's generic inference
  // doesn't correctly handle ScreenPluginOptions
  (application.add as (plugin: typeof ScreensPlugin, options: unknown) => void)(
    ScreensPlugin,
    {
      main: { loadBeforeTransition: true },
      overlay: { loadBeforeTransition: true },
    }
  );
}

/**
 * Mounts the application canvas to the DOM.
 *
 * @param application - The initialized Astro Application
 * @throws Error if the app container element is not found
 *
 * @example
 * await app.init();
 * mountToDOM(app);
 */
function mountToDOM(application: Application): void {
  const stage = application.get(StagePlugin);
  const container = document.getElementById('app');

  if (container === null) {
    throw new Error('App container element not found');
  }

  container.appendChild(stage.view);
}

/**
 * Shows the initial screen and marks the game as ready.
 *
 * @param application - The initialized Astro Application
 * @returns Promise that resolves when the screen is shown
 *
 * @example
 * await showInitialScreen(app);
 */
async function showInitialScreen(application: Application): Promise<void> {
  const screens = application.get(ScreensPlugin);
  screens.main.add(GameScreen, undefined, 'game');
  await screens.main.show('game' as 'empty');
  markGameReady('game');
}

/**
 * Returns the current Application instance.
 *
 * Use this function to access the application after bootstrap has been called.
 * Returns null if bootstrap() has not been called yet.
 *
 * @returns The Application instance or null if not yet bootstrapped
 *
 * @example
 * import { getApp } from '@app';
 * import { ScreensPlugin } from '@play-co/astro';
 *
 * const app = getApp();
 * if (app) {
 *   const screens = app.get(ScreensPlugin);
 *   // Navigate to a different screen
 *   await screens.main.show('menu');
 * }
 *
 * @example
 * // Checking if app is ready
 * import { getApp } from '@app';
 *
 * function isAppReady(): boolean {
 *   return getApp() !== null;
 * }
 */
export function getApp(): Application | null {
  return app;
}
