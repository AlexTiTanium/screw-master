/**
 * Debug Console UI Component
 *
 * A floating, draggable debug console panel that displays console logs
 * and provides buttons for Copy, Clear, and Report Bug actions.
 *
 * @example
 * // Initialize in dev/test mode
 * import { createDebugConsole } from '@shared/debug/ui/debugConsole';
 *
 * const console = createDebugConsole();
 * document.body.appendChild(console);
 *
 * @module
 */

/* eslint-disable max-lines-per-function */
/* eslint-disable no-console */

import {
  initConsoleCapture,
  clearCapturedLogs,
  getOriginalConsole,
} from '../consoleCapture';
import { showBugReportModal } from '../bugReport';

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = 'debugConsole';
const DEFAULT_WIDTH = 350;
const DEFAULT_HEIGHT = 200;
const HEADER_HEIGHT = 30;
const FOOTER_HEIGHT = 36;

// ============================================================================
// State Management
// ============================================================================

interface ConsoleState {
  x: number;
  y: number;
  minimized: boolean;
  visible: boolean;
}

function loadState(): ConsoleState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved) as ConsoleState;
    }
  } catch {
    // Ignore localStorage errors
  }
  return {
    x: 10,
    y: window.innerHeight - DEFAULT_HEIGHT - 10,
    minimized: false,
    visible: true,
  };
}

function saveState(state: ConsoleState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore localStorage errors
  }
}

// ============================================================================
// DOM Creation Helpers
// ============================================================================

function createContainer(state: ConsoleState): HTMLDivElement {
  const container = document.createElement('div');
  container.id = 'debug-console';
  const height = state.minimized ? HEADER_HEIGHT : DEFAULT_HEIGHT;
  container.style.cssText = `
    position: fixed;
    left: ${String(state.x)}px;
    top: ${String(state.y)}px;
    width: ${String(DEFAULT_WIDTH)}px;
    height: ${String(height)}px;
    background: rgba(17, 17, 17, 0.95);
    border: 1px solid #333;
    border-radius: 6px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 11px;
    z-index: 9999;
    display: ${state.visible ? 'flex' : 'none'};
    flex-direction: column;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    overflow: hidden;
  `;
  return container;
}

function createHeader(): HTMLDivElement {
  const header = document.createElement('div');
  header.style.cssText = `
    height: ${String(HEADER_HEIGHT)}px;
    background: #222;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 8px;
    cursor: move;
    user-select: none;
    border-bottom: 1px solid #333;
    flex-shrink: 0;
  `;
  return header;
}

function createHeaderTitle(): HTMLSpanElement {
  const title = document.createElement('span');
  title.textContent = 'Debug Console';
  title.style.cssText = `
    color: #888;
    font-size: 12px;
    font-weight: 500;
  `;
  return title;
}

function createHeaderButtons(): HTMLDivElement {
  const buttons = document.createElement('div');
  buttons.style.cssText = `
    display: flex;
    gap: 6px;
  `;
  return buttons;
}

function createHeaderButton(
  symbol: string,
  title: string,
  onClick: () => void
): HTMLButtonElement {
  const button = document.createElement('button');
  button.textContent = symbol;
  button.title = title;
  button.style.cssText = `
    width: 20px;
    height: 20px;
    background: #333;
    border: none;
    border-radius: 3px;
    color: #888;
    font-size: 14px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  `;
  button.onmouseenter = (): void => {
    button.style.background = '#444';
    button.style.color = '#fff';
  };
  button.onmouseleave = (): void => {
    button.style.background = '#333';
    button.style.color = '#888';
  };
  button.onclick = (e): void => {
    e.stopPropagation();
    onClick();
  };
  return button;
}

function createLogArea(): HTMLDivElement {
  const logArea = document.createElement('div');
  logArea.style.cssText = `
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 6px 8px;
    color: #0f0;
  `;
  return logArea;
}

function createFooter(): HTMLDivElement {
  const footer = document.createElement('div');
  footer.style.cssText = `
    height: ${String(FOOTER_HEIGHT)}px;
    background: #222;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding: 0 8px;
    gap: 8px;
    border-top: 1px solid #333;
    flex-shrink: 0;
  `;
  return footer;
}

function createFooterButton(
  text: string,
  isPrimary: boolean,
  onClick: () => void
): HTMLButtonElement {
  const button = document.createElement('button');
  button.textContent = text;
  button.style.cssText = `
    padding: 4px 10px;
    background: ${isPrimary ? '#2a5a2a' : '#333'};
    border: 1px solid ${isPrimary ? '#3d7a3d' : '#444'};
    border-radius: 4px;
    color: ${isPrimary ? '#6f6' : '#aaa'};
    font-family: inherit;
    font-size: 11px;
    cursor: pointer;
  `;
  button.onmouseenter = (): void => {
    button.style.background = isPrimary ? '#3d7a3d' : '#444';
    button.style.color = isPrimary ? '#8f8' : '#fff';
  };
  button.onmouseleave = (): void => {
    button.style.background = isPrimary ? '#2a5a2a' : '#333';
    button.style.color = isPrimary ? '#6f6' : '#aaa';
  };
  button.onclick = onClick;
  return button;
}

function createLogLine(
  type: 'log' | 'warn' | 'error',
  message: string
): HTMLDivElement {
  const line = document.createElement('div');
  line.style.cssText = `
    color: ${type === 'error' ? '#f66' : type === 'warn' ? '#ff0' : '#0f0'};
    word-wrap: break-word;
    white-space: pre-wrap;
    margin-bottom: 2px;
    line-height: 1.4;
  `;
  const prefix = type === 'error' ? 'ERR' : type === 'warn' ? 'WRN' : 'LOG';
  line.textContent = `[${prefix}] ${message}`;
  return line;
}

// ============================================================================
// Drag Handling
// ============================================================================

function setupDragging(
  container: HTMLDivElement,
  header: HTMLDivElement,
  state: ConsoleState
): void {
  let isDragging = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;

  // Helper to start drag
  const startDrag = (clientX: number, clientY: number): void => {
    isDragging = true;
    dragOffsetX = clientX - state.x;
    dragOffsetY = clientY - state.y;
    document.body.style.userSelect = 'none';
  };

  // Helper to move during drag
  const moveDrag = (clientX: number, clientY: number): void => {
    if (!isDragging) return;
    const newX = clientX - dragOffsetX;
    const newY = clientY - dragOffsetY;

    // Constrain to viewport
    const maxX = window.innerWidth - container.offsetWidth;
    const maxY = window.innerHeight - container.offsetHeight;
    state.x = Math.max(0, Math.min(newX, maxX));
    state.y = Math.max(0, Math.min(newY, maxY));

    container.style.left = `${String(state.x)}px`;
    container.style.top = `${String(state.y)}px`;
  };

  // Helper to end drag
  const endDrag = (): void => {
    if (isDragging) {
      isDragging = false;
      document.body.style.userSelect = '';
      saveState(state);
    }
  };

  // Mouse events (desktop)
  header.addEventListener('mousedown', (e: MouseEvent): void => {
    if ((e.target as HTMLElement).tagName === 'BUTTON') return;
    e.preventDefault();
    startDrag(e.clientX, e.clientY);
  });

  document.addEventListener('mousemove', (e: MouseEvent) => {
    moveDrag(e.clientX, e.clientY);
  });

  document.addEventListener('mouseup', endDrag);

  // Touch events (mobile/device emulation)
  header.addEventListener(
    'touchstart',
    (e: TouchEvent): void => {
      if ((e.target as HTMLElement).tagName === 'BUTTON') return;
      const touch = e.touches[0];
      if (!touch) return;
      e.preventDefault();
      startDrag(touch.clientX, touch.clientY);
    },
    { passive: false }
  );

  document.addEventListener(
    'touchmove',
    (e: TouchEvent) => {
      if (!isDragging) return;
      const touch = e.touches[0];
      if (!touch) return;
      e.preventDefault();
      moveDrag(touch.clientX, touch.clientY);
    },
    { passive: false }
  );

  document.addEventListener('touchend', endDrag);
  document.addEventListener('touchcancel', endDrag);
}

// ============================================================================
// Keyboard Shortcut
// ============================================================================

function setupKeyboardShortcut(
  container: HTMLDivElement,
  state: ConsoleState
): void {
  document.addEventListener('keydown', (e) => {
    // Backtick key toggles visibility
    if (e.key === '`' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const target = e.target as HTMLElement;
      // Don't toggle if user is typing in an input/textarea
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }
      state.visible = !state.visible;
      container.style.display = state.visible ? 'flex' : 'none';
      saveState(state);
    }
  });
}

// ============================================================================
// Log Display Management
// ============================================================================

interface LogDisplayManager {
  addLog: (type: 'log' | 'warn' | 'error', message: string) => void;
  clear: () => void;
  getLogText: () => string;
}

function createLogDisplayManager(logArea: HTMLDivElement): LogDisplayManager {
  const logLines: HTMLDivElement[] = [];
  const MAX_DISPLAY_LOGS = 500;

  return {
    addLog(type: 'log' | 'warn' | 'error', message: string): void {
      const line = createLogLine(type, message);
      logArea.appendChild(line);
      logLines.push(line);

      // Trim old logs
      while (logLines.length > MAX_DISPLAY_LOGS) {
        const oldLine = logLines.shift();
        oldLine?.remove();
      }

      // Auto-scroll to bottom
      logArea.scrollTop = logArea.scrollHeight;
    },

    clear(): void {
      logArea.innerHTML = '';
      logLines.length = 0;
    },

    getLogText(): string {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      return logLines.map((line) => line.textContent ?? '').join('\n');
    },
  };
}

// ============================================================================
// Console Override Integration
// ============================================================================

function setupConsoleIntegration(logManager: LogDisplayManager): void {
  // Initialize console capture first
  initConsoleCapture();

  // Get original console for our own logging
  const original = getOriginalConsole();

  // Now override again to also update the display
  const prevLog = console.log;
  const prevWarn = console.warn;
  const prevError = console.error;

  console.log = (...args: unknown[]): void => {
    prevLog(...args);
    const msg = args.map((a) => safeStringify(a)).join(' ');
    logManager.addLog('log', msg);
  };

  console.warn = (...args: unknown[]): void => {
    prevWarn(...args);
    const msg = args.map((a) => safeStringify(a)).join(' ');
    logManager.addLog('warn', msg);
  };

  console.error = (...args: unknown[]): void => {
    prevError(...args);
    const msg = args.map((a) => safeStringify(a)).join(' ');
    logManager.addLog('error', msg);
  };

  // Log to original console that we're initialized
  original?.log('[DebugConsole] Initialized - Press ` to toggle');
}

function safeStringify(obj: unknown): string {
  try {
    if (typeof obj === 'object' && obj !== null) {
      return JSON.stringify(obj, null, 2);
    }
    return String(obj);
  } catch {
    return Object.prototype.toString.call(obj);
  }
}

// ============================================================================
// Main Export
// ============================================================================

/**
 * Create and return the debug console element.
 * Should be appended to document.body.
 *
 * @returns The debug console container element
 *
 * @example
 * if (import.meta.env.DEV || isTestMode()) {
 *   const console = createDebugConsole();
 *   document.body.appendChild(console);
 * }
 */
export function createDebugConsole(): HTMLDivElement {
  // Load saved state
  const state = loadState();

  // Create DOM structure
  const container = createContainer(state);
  const header = createHeader();
  const headerTitle = createHeaderTitle();
  const headerButtons = createHeaderButtons();
  const logArea = createLogArea();
  const footer = createFooter();

  // Create log manager
  const logManager = createLogDisplayManager(logArea);

  // Create header buttons
  const minimizeBtn = createHeaderButton(
    state.minimized ? '+' : '-',
    'Minimize/Expand',
    () => {
      state.minimized = !state.minimized;
      container.style.height = state.minimized
        ? `${String(HEADER_HEIGHT)}px`
        : `${String(DEFAULT_HEIGHT)}px`;
      minimizeBtn.textContent = state.minimized ? '+' : '-';
      logArea.style.display = state.minimized ? 'none' : 'block';
      footer.style.display = state.minimized ? 'none' : 'flex';
      saveState(state);
    }
  );

  const closeBtn = createHeaderButton('x', 'Close (` to reopen)', () => {
    state.visible = false;
    container.style.display = 'none';
    saveState(state);
  });

  // Create footer buttons
  const copyBtn = createFooterButton('Copy', false, () => {
    const text = logManager.getLogText();
    void navigator.clipboard.writeText(text).then(() => {
      const originalText = copyBtn.textContent;
      copyBtn.textContent = 'Copied!';
      setTimeout(() => {
        copyBtn.textContent = originalText;
      }, 1000);
    });
  });

  const clearBtn = createFooterButton('Clear', false, () => {
    logManager.clear();
    clearCapturedLogs();
  });

  const reportBtn = createFooterButton('Report Bug', true, () => {
    showBugReportModal();
  });

  // Assemble header
  headerButtons.appendChild(minimizeBtn);
  headerButtons.appendChild(closeBtn);
  header.appendChild(headerTitle);
  header.appendChild(headerButtons);

  // Assemble footer
  footer.appendChild(copyBtn);
  footer.appendChild(clearBtn);
  footer.appendChild(reportBtn);

  // Assemble container
  container.appendChild(header);
  container.appendChild(logArea);
  container.appendChild(footer);

  // Apply minimized state
  if (state.minimized) {
    logArea.style.display = 'none';
    footer.style.display = 'none';
  }

  // Setup behaviors
  setupDragging(container, header, state);
  setupKeyboardShortcut(container, state);
  setupConsoleIntegration(logManager);

  return container;
}
