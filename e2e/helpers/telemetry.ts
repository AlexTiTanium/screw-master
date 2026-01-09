import type { Page, ConsoleMessage } from '@playwright/test';

export interface TelemetryEntry {
  type: 'log' | 'warn' | 'error' | 'info' | 'debug';
  text: string;
  timestamp: number;
}

export interface PageErrorEntry {
  message: string;
  stack?: string | undefined;
  timestamp: number;
}

export interface Telemetry {
  consoleLogs: TelemetryEntry[];
  pageErrors: PageErrorEntry[];
  networkErrors: string[];
}

/**
 * Attach telemetry collectors to a page
 */
export function attachTelemetry(page: Page): Telemetry {
  const telemetry: Telemetry = {
    consoleLogs: [],
    pageErrors: [],
    networkErrors: [],
  };

  // Capture console messages
  page.on('console', (msg: ConsoleMessage) => {
    telemetry.consoleLogs.push({
      type: msg.type() as TelemetryEntry['type'],
      text: msg.text(),
      timestamp: Date.now(),
    });
  });

  // Capture page errors (uncaught exceptions)
  page.on('pageerror', (error: Error) => {
    telemetry.pageErrors.push({
      message: error.message,
      stack: error.stack,
      timestamp: Date.now(),
    });
  });

  // Capture network failures
  page.on('requestfailed', (request) => {
    telemetry.networkErrors.push(
      `${request.failure()?.errorText ?? 'Unknown error'}: ${request.url()}`
    );
  });

  return telemetry;
}

/**
 * Print telemetry for debugging
 */
export function printTelemetry(telemetry: Telemetry): void {
  console.log('\n=== CONSOLE OUTPUT ===');
  for (const entry of telemetry.consoleLogs) {
    const prefix =
      entry.type === 'error'
        ? '\x1b[31m[ERROR]\x1b[0m'
        : entry.type === 'warn'
          ? '\x1b[33m[WARN]\x1b[0m'
          : `[${entry.type.toUpperCase()}]`;
    console.log(`${prefix} ${entry.text}`);
  }

  if (telemetry.pageErrors.length > 0) {
    console.log('\n=== PAGE ERRORS ===');
    for (const error of telemetry.pageErrors) {
      console.log(`\x1b[31m${error.message}\x1b[0m`);
      if (error.stack) {
        console.log(error.stack);
      }
    }
  }

  if (telemetry.networkErrors.length > 0) {
    console.log('\n=== NETWORK ERRORS ===');
    for (const error of telemetry.networkErrors) {
      console.log(`\x1b[31m${error}\x1b[0m`);
    }
  }
}

/**
 * Get errors from telemetry
 */
export function getErrors(telemetry: Telemetry): string[] {
  const errors: string[] = [];

  // Console errors
  for (const entry of telemetry.consoleLogs) {
    if (entry.type === 'error') {
      errors.push(entry.text);
    }
  }

  // Page errors
  for (const error of telemetry.pageErrors) {
    errors.push(error.message);
  }

  return errors;
}

/**
 * Get warnings from telemetry
 */
export function getWarnings(telemetry: Telemetry): string[] {
  const warnings: string[] = [];

  for (const entry of telemetry.consoleLogs) {
    if (entry.type === 'warn') {
      warnings.push(entry.text);
    }
  }

  return warnings;
}
