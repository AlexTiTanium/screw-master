import { bootstrap } from '@app/bootstrap';
import { initTestHarness, isTestMode } from '@shared/debug';

// Initialize test harness early (before any errors can occur)
initTestHarness();

// Create a debug log element to show console on page (only in dev/test mode)
if (import.meta.env.DEV || isTestMode()) {
  const debugLog = document.createElement('div');
  debugLog.id = 'debug-log';
  debugLog.style.cssText =
    'position:fixed;bottom:0;left:0;right:0;max-height:200px;overflow:auto;background:#111;color:#0f0;font-family:monospace;font-size:12px;padding:10px;padding-top:30px;z-index:9999;';
  document.body.appendChild(debugLog);

  // Create copy button
  const copyBtn = document.createElement('button');
  copyBtn.textContent = 'Copy';
  copyBtn.style.cssText =
    'position:absolute;top:5px;right:5px;padding:2px 8px;background:#333;color:#0f0;border:1px solid #0f0;cursor:pointer;font-family:monospace;font-size:11px;';
  copyBtn.onclick = (): void => {
    const text = debugLog.innerText;
    void navigator.clipboard.writeText(text).then(() => {
      copyBtn.textContent = 'Copied!';
      setTimeout(() => {
        copyBtn.textContent = 'Copy';
      }, 1000);
    });
  };
  debugLog.appendChild(copyBtn);

  /* eslint-disable no-console */
  const originalConsole = {
    log: console.log.bind(console),
    error: console.error.bind(console),
    warn: console.warn.bind(console),
  };

  const safeStringify = (obj: unknown): string => {
    try {
      if (typeof obj === 'object' && obj !== null) {
        return JSON.stringify(obj, null, 2);
      }
      return String(obj);
    } catch {
      // Handle circular references
      return Object.prototype.toString.call(obj);
    }
  };

  const log = (type: string, ...args: unknown[]): void => {
    const msg = args.map((a) => safeStringify(a)).join(' ');
    const line = document.createElement('div');
    line.style.color =
      type === 'error' ? '#f00' : type === 'warn' ? '#ff0' : '#0f0';
    line.textContent = `[${type}] ${msg}`;
    debugLog.appendChild(line);
    debugLog.scrollTop = debugLog.scrollHeight;
  };

  console.log = (...args: unknown[]): void => {
    originalConsole.log(...args);
    log('log', ...args);
  };
  console.error = (...args: unknown[]): void => {
    originalConsole.error(...args);
    log('error', ...args);
  };
  console.warn = (...args: unknown[]): void => {
    originalConsole.warn(...args);
    log('warn', ...args);
  };
  /* eslint-enable no-console */
}

async function main(): Promise<void> {
  try {
    // eslint-disable-next-line no-console
    console.log('Starting application...');
    await bootstrap();
    // eslint-disable-next-line no-console
    console.log('Application started successfully');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to initialize application:', error);
    // Capture in test harness
    if (window.__gameTest) {
      window.__gameTest.captureError(
        error instanceof Error ? error : new Error(String(error)),
        'main'
      );
    }
    // Display error on page
    const appDiv = document.getElementById('app');
    if (appDiv) {
      appDiv.innerHTML = `<pre style="color: red; padding: 20px;">${String(error)}\n\n${error instanceof Error ? (error.stack ?? '') : ''}</pre>`;
    }
  }
}

void main();
