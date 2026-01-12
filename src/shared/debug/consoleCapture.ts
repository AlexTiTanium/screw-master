/**
 * Console Log Capture System
 *
 * This module captures all console output (log, warn, error) into an array
 * for inclusion in bug reports. Each log entry includes the message type,
 * timestamp, current game tick, and stringified arguments.
 *
 * @example
 * // Initialize early in app startup
 * initConsoleCapture();
 *
 * // Later, get all captured logs
 * const logs = getCapturedLogs();
 *
 * @module
 */

/* eslint-disable jsdoc/require-returns, jsdoc/require-param, jsdoc/require-example */
/* eslint-disable no-console */

/**
 * Represents a captured console log entry.
 */
export interface CapturedLog {
  /** Log type: log, warn, or error */
  type: 'log' | 'warn' | 'error';
  /** Performance timestamp when the log occurred (ms since page load) */
  timestamp: number;
  /** Game tick number when the log occurred (-1 if not available) */
  tick: number;
  /** Stringified log arguments */
  args: string[];
}

/** Maximum number of logs to retain */
const MAX_LOGS = 1000;

/** Storage for captured logs */
let capturedLogs: CapturedLog[] = [];

/** Original console methods (saved before override) */
let originalConsole: {
  log: typeof console.log;
  warn: typeof console.warn;
  error: typeof console.error;
} | null = null;

/** Whether capture has been initialized */
let isInitialized = false;

/**
 * Safely stringify a value for logging.
 * Handles circular references and non-serializable values.
 */
function safeStringify(obj: unknown): string {
  try {
    if (typeof obj === 'object' && obj !== null) {
      return JSON.stringify(obj, null, 2);
    }
    return String(obj);
  } catch {
    // Handle circular references
    return Object.prototype.toString.call(obj);
  }
}

/**
 * Get the current game tick from the test harness.
 * Returns -1 if not available.
 */
function getCurrentTick(): number {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  return window.__gameTest?.tick?.current ?? -1;
}

/**
 * Add a log entry to the captured logs array.
 * Removes oldest entries if exceeding MAX_LOGS.
 */
function addLog(type: CapturedLog['type'], args: unknown[]): void {
  const entry: CapturedLog = {
    type,
    timestamp: performance.now(),
    tick: getCurrentTick(),
    args: args.map(safeStringify),
  };

  capturedLogs.push(entry);

  // Trim to max size
  if (capturedLogs.length > MAX_LOGS) {
    capturedLogs = capturedLogs.slice(-MAX_LOGS);
  }
}

/**
 * Initialize console capture by overriding console methods.
 * Safe to call multiple times - only initializes once.
 *
 * @example
 * // Call early in app initialization
 * initConsoleCapture();
 */
export function initConsoleCapture(): void {
  if (isInitialized) {
    return;
  }

  // Save original methods
  originalConsole = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
  };

  // Override console.log
  console.log = (...args: unknown[]): void => {
    originalConsole?.log(...args);
    addLog('log', args);
  };

  // Override console.warn
  console.warn = (...args: unknown[]): void => {
    originalConsole?.warn(...args);
    addLog('warn', args);
  };

  // Override console.error
  console.error = (...args: unknown[]): void => {
    originalConsole?.error(...args);
    addLog('error', args);
  };

  isInitialized = true;
}

/**
 * Get a copy of all captured logs.
 *
 * @returns Array of captured log entries
 *
 * @example
 * const logs = getCapturedLogs();
 * console.log(`Captured ${logs.length} log entries`);
 */
export function getCapturedLogs(): CapturedLog[] {
  return [...capturedLogs];
}

/**
 * Clear all captured logs.
 *
 * @example
 * // Clear logs after submitting bug report
 * clearCapturedLogs();
 */
export function clearCapturedLogs(): void {
  capturedLogs = [];
}

/**
 * Get the original console methods (for direct logging that bypasses capture).
 * Returns null if capture hasn't been initialized.
 *
 * @example
 * const original = getOriginalConsole();
 * original?.log('This will not be captured');
 */
export function getOriginalConsole(): typeof originalConsole {
  return originalConsole;
}

/**
 * Format captured logs as a text string for saving to file.
 *
 * @returns Formatted log text with timestamps and tick numbers
 *
 * @example
 * const logText = formatLogsAsText();
 * await fs.writeFile('console-log.txt', logText);
 */
export function formatLogsAsText(): string {
  return capturedLogs
    .map((log) => {
      const tickStr = log.tick >= 0 ? `T${String(log.tick)}` : '---';
      const timeStr = log.timestamp.toFixed(0).padStart(8);
      const typeStr = log.type.toUpperCase().padEnd(5);
      const message = log.args.join(' ');
      return `[${timeStr}ms] [${tickStr}] [${typeStr}] ${message}`;
    })
    .join('\n');
}
