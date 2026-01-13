/**
 * Central tick counter for deterministic debug logging.
 *
 * Provides a frame-based tick counter that all systems can use for logging.
 * This enables deterministic reproduction of bugs from error logs by
 * replaying actions at specific tick numbers.
 *
 * @example
 * // In a system's update method
 * gameTick.update();
 *
 * // Log with tick number
 * gameTick.log('TAP', `(${x}, ${y}) → ${color} screw`);
 * // Output: [T42] TAP: (100, 200) → red screw
 *
 * // Get current tick for E2E replay
 * const tick = gameTick.current;
 */

/** Current tick number, incremented each frame */
let currentTick = 0;

/** Whether debug logging is enabled */
let loggingEnabled = true;

/**
 * Game tick counter singleton.
 *
 * The tick counter provides a consistent frame reference for all debug logs,
 * making it possible to deterministically reproduce bugs by replaying
 * input sequences at specific tick numbers.
 */
export const gameTick = {
  /**
   * Get the current tick number.
   * @returns The current frame tick
   */
  get current(): number {
    return currentTick;
  },

  /**
   * Increment the tick counter. Call this once per frame in the main update loop.
   * Should be called by a single system (typically a TickSystem or the scene).
   * @example
   * gameTick.update(); // Call in TickSystem.update()
   */
  update(): void {
    currentTick++;
  },

  /**
   * Reset the tick counter to zero.
   * Useful for level restarts or E2E test setup.
   * @example
   * gameTick.reset(); // Called when loading a new level
   */
  reset(): void {
    currentTick = 0;
  },

  /**
   * Enable or disable logging output.
   * @param enabled - Whether to enable logging
   * @example
   * gameTick.setLoggingEnabled(false); // Disable logging in production
   */
  setLoggingEnabled(enabled: boolean): void {
    loggingEnabled = enabled;
  },

  /**
   * Log a message with the current tick number prefix.
   *
   * Format: `[T{tick}] {category}: {message}`
   *
   * @param category - Log category (e.g., 'TAP', 'TRAY', 'TRANSFER')
   * @param message - The log message
   *
   * @example
   * gameTick.log('TAP', '(100, 200) → red screw → colored tray [slot 0]');
   * // Output: [T42] TAP: (100, 200) → red screw → colored tray [slot 0]
   */
  log(category: string, message: string): void {
    if (loggingEnabled) {
      // eslint-disable-next-line no-console
      console.log(`[T${String(currentTick)}] ${category}: ${message}`);
    }
  },

  /**
   * Log a debug message without category (simpler format).
   *
   * Format: `[T{tick}] {message}`
   *
   * @param message - The log message
   *
   * @example
   * gameTick.debug('Animation complete');
   * // Output: [T42] Animation complete
   */
  debug(message: string): void {
    if (loggingEnabled) {
      // eslint-disable-next-line no-console
      console.log(`[T${String(currentTick)}] ${message}`);
    }
  },

  /**
   * Log a warning message with the current tick number prefix.
   * Uses console.warn for higher visibility in developer tools.
   *
   * Format: `[T{tick}] {category}: {message}`
   *
   * @param category - Warning category (e.g., 'SNAP_CORRECTION')
   * @param message - The warning message
   *
   * @example
   * gameTick.warn('SNAP_CORRECTION', 'screw at (100, 200) snapped to (105, 200)');
   * // Output: [T42] SNAP_CORRECTION: screw at (100, 200) snapped to (105, 200)
   */
  warn(category: string, message: string): void {
    if (loggingEnabled) {
      // eslint-disable-next-line no-console
      console.warn(`[T${String(currentTick)}] ${category}: ${message}`);
    }
  },
};
