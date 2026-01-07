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
