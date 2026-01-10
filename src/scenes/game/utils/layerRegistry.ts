/**
 * Registry for layer containers used by animation system.
 *
 * This module provides a way for GameScene to register its layer containers
 * so that AnimationSystem can access them without direct coupling.
 */

import type { Container } from 'pixi.js';

let animationLayer: Container | null = null;
let coloredTrayLayer: Container | null = null;

/**
 * Register the animation layer container.
 * Called by GameScene during initialization.
 *
 * @param layer - The animation layer container
 * @example
 * registerAnimationLayer(container);
 */
export function registerAnimationLayer(layer: Container): void {
  animationLayer = layer;
}

/**
 * Register the colored tray layer container.
 * Called by GameScene during initialization.
 *
 * @param layer - The colored tray layer container
 * @example
 * registerColoredTrayLayer(container);
 */
export function registerColoredTrayLayer(layer: Container): void {
  coloredTrayLayer = layer;
}

/**
 * Get the animation layer container.
 * Used by AnimationSystem to move screws to top during animation.
 *
 * @returns The animation layer container or null if not registered
 * @example
 * const layer = getAnimationLayer();
 * if (layer) layer.addChild(sprite);
 */
export function getAnimationLayer(): Container | null {
  return animationLayer;
}

/**
 * Get the colored tray layer container.
 * Used by AnimationSystem to move screws to correct layer after animation.
 *
 * @returns The colored tray layer container or null if not registered
 * @example
 * const layer = getColoredTrayLayer();
 * if (layer) layer.addChild(sprite);
 */
export function getColoredTrayLayer(): Container | null {
  return coloredTrayLayer;
}

/**
 * Clear the layer registry.
 * Called when GameScene is destroyed.
 * @example
 * clearLayerRegistry();
 */
export function clearLayerRegistry(): void {
  animationLayer = null;
  coloredTrayLayer = null;
}
