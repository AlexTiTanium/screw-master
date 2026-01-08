/**
 * Constrains a value within a specified range.
 *
 * Returns `min` if `value < min`, `max` if `value > max`,
 * otherwise returns `value` unchanged.
 *
 * @param value - The value to clamp
 * @param min - The minimum allowed value
 * @param max - The maximum allowed value
 * @returns The clamped value
 *
 * @example
 * // Basic usage
 * clamp(15, 0, 10);  // Returns 10
 * clamp(-5, 0, 10);  // Returns 0
 * clamp(5, 0, 10);   // Returns 5
 *
 * @example
 * // Clamping player health
 * player.health = clamp(player.health - damage, 0, player.maxHealth);
 *
 * @example
 * // Keeping position within bounds
 * import { APP_CONFIG } from '@app';
 *
 * entity.position.x = clamp(entity.position.x, 0, APP_CONFIG.width);
 * entity.position.y = clamp(entity.position.y, 0, APP_CONFIG.height);
 *
 * @example
 * // Clamping rotation to valid range
 * rotation = clamp(rotation, -Math.PI, Math.PI);
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Linearly interpolates between two values.
 *
 * Returns a value between `start` and `end` based on the interpolation
 * factor `t`. The factor is automatically clamped to [0, 1].
 *
 * - `t = 0` returns `start`
 * - `t = 1` returns `end`
 * - `t = 0.5` returns the midpoint
 *
 * @param start - The starting value (returned when t=0)
 * @param end - The ending value (returned when t=1)
 * @param t - Interpolation factor, automatically clamped to [0, 1]
 * @returns The interpolated value
 *
 * @example
 * // Basic interpolation
 * lerp(0, 100, 0);    // Returns 0
 * lerp(0, 100, 0.5);  // Returns 50
 * lerp(0, 100, 1);    // Returns 100
 *
 * @example
 * // Smooth position animation (easing)
 * const smoothness = 0.1;
 * entity.position.x = lerp(entity.position.x, targetX, smoothness);
 * entity.position.y = lerp(entity.position.y, targetY, smoothness);
 *
 * @example
 * // Fade alpha over time
 * const fadeProgress = elapsedTime / fadeDuration;
 * sprite.alpha = lerp(1, 0, fadeProgress);
 *
 * @example
 * // Animate between two colors (interpolate each channel)
 * const r = lerp(startR, endR, progress);
 * const g = lerp(startG, endG, progress);
 * const b = lerp(startB, endB, progress);
 */
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * clamp(t, 0, 1);
}

/**
 * Calculates the Euclidean distance between two 2D points.
 *
 * @param p1 - The first point with x and y coordinates
 * @param p1.x - X coordinate of the first point
 * @param p1.y - Y coordinate of the first point
 * @param p2 - The second point with x and y coordinates
 * @param p2.x - X coordinate of the second point
 * @param p2.y - Y coordinate of the second point
 * @returns The distance between the two points
 *
 * @example
 * // Basic usage
 * const d = distance({ x: 0, y: 0 }, { x: 3, y: 4 }); // Returns 5
 *
 * @example
 * // Check if entities are within range
 * const d = distance(player.position, enemy.position);
 * if (d < attackRange) {
 *   performAttack();
 * }
 */
export function distance(
  p1: { x: number; y: number },
  p2: { x: number; y: number }
): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Linearly interpolates between two 2D points.
 *
 * @param start - The starting point
 * @param start.x - X coordinate of the starting point
 * @param start.y - Y coordinate of the starting point
 * @param end - The ending point
 * @param end.x - X coordinate of the ending point
 * @param end.y - Y coordinate of the ending point
 * @param t - Interpolation factor, automatically clamped to [0, 1]
 * @returns The interpolated point
 *
 * @example
 * // Smooth movement towards target
 * entity.position = lerp2D(entity.position, target, 0.1);
 *
 * @example
 * // Get midpoint
 * const midpoint = lerp2D(pointA, pointB, 0.5);
 */
export function lerp2D(
  start: { x: number; y: number },
  end: { x: number; y: number },
  t: number
): { x: number; y: number } {
  return {
    x: lerp(start.x, end.x, t),
    y: lerp(start.y, end.y, t),
  };
}

/**
 * Clamps a position within rectangular bounds.
 *
 * @param pos - The position to clamp
 * @param pos.x - X coordinate of the position
 * @param pos.y - Y coordinate of the position
 * @param bounds - The bounding rectangle with width and height
 * @param bounds.width - Width of the bounding rectangle
 * @param bounds.height - Height of the bounding rectangle
 * @returns The clamped position
 *
 * @example
 * // Keep entity within screen bounds
 * import { APP_CONFIG } from '@app';
 *
 * entity.position = clampPosition(entity.position, {
 *   width: APP_CONFIG.width,
 *   height: APP_CONFIG.height
 * });
 *
 * @example
 * // Clamp with custom bounds
 * const safeBounds = { width: 800, height: 600 };
 * player.position = clampPosition(player.position, safeBounds);
 */
export function clampPosition(
  pos: { x: number; y: number },
  bounds: { width: number; height: number }
): { x: number; y: number } {
  return {
    x: clamp(pos.x, 0, bounds.width),
    y: clamp(pos.y, 0, bounds.height),
  };
}
