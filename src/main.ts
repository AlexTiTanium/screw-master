import { bootstrap } from '@app/bootstrap';
import { initTestHarness, isTestMode } from '@shared/debug';
import { createDebugConsole } from '@shared/debug/ui/debugConsole';

// Initialize test harness early (before any errors can occur)
initTestHarness();

// Create debug UI in dev/test mode (includes integrated performance monitor)
if (import.meta.env.DEV || isTestMode()) {
  const debugConsole = createDebugConsole();
  document.body.appendChild(debugConsole);
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
