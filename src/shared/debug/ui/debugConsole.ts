/**
 * Debug Console UI Component
 *
 * A floating, draggable debug console panel that displays console logs
 * and performance metrics. Includes buttons for Copy, Clear, and Report Bug.
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
import { recordTelemetry } from '../telemetry';
import { PhysicsWorldManager } from '@physics';

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = 'debugConsole';
const DEFAULT_X = 0;
const DEFAULT_Y = 662;
const DEFAULT_WIDTH = 398;
const DEFAULT_HEIGHT = 148;
const HEADER_HEIGHT = 30;
const FOOTER_HEIGHT = 36;
const PERF_PANEL_WIDTH = 175;
const FPS_SAMPLE_COUNT = 60;
const PHYSICS_RATE_UPDATE_INTERVAL = 500;
const SPARKLINE_WIDTH = 50;
const SPARKLINE_HEIGHT = 12;
const SPARKLINE_SAMPLES = 30;

// ============================================================================
// State Management
// ============================================================================

interface ConsoleState {
  x: number;
  y: number;
  width: number;
  height: number;
  minimized: boolean;
  visible: boolean;
}

function loadState(): ConsoleState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<ConsoleState>;
      return {
        x: parsed.x ?? DEFAULT_X,
        y: parsed.y ?? DEFAULT_Y,
        width: parsed.width ?? DEFAULT_WIDTH,
        height: parsed.height ?? DEFAULT_HEIGHT,
        minimized: parsed.minimized ?? false,
        visible: parsed.visible ?? true,
      };
    }
  } catch {
    // Ignore localStorage errors
  }
  return {
    x: DEFAULT_X,
    y: DEFAULT_Y,
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
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
// Performance Metrics
// ============================================================================

interface MetricsState {
  frameTimes: number[];
  lastTime: number;
  lastPhysicsStepCount: number;
  lastPhysicsTime: number;
  physicsRate: number;
  alphaHistory: number[];
  alphaMin: number;
  alphaMax: number;
}

const ALPHA_HISTORY_SIZE = 60;

function createMetricsState(): MetricsState {
  return {
    frameTimes: [],
    lastTime: performance.now(),
    lastPhysicsStepCount: 0,
    lastPhysicsTime: performance.now(),
    physicsRate: 0,
    alphaHistory: [],
    alphaMin: 1,
    alphaMax: 0,
  };
}

function updateAlphaStats(metrics: MetricsState, alpha: number): void {
  metrics.alphaHistory.push(alpha);
  if (metrics.alphaHistory.length > ALPHA_HISTORY_SIZE) {
    metrics.alphaHistory.shift();
  }

  // Calculate min/max from recent history
  if (metrics.alphaHistory.length > 0) {
    metrics.alphaMin = Math.min(...metrics.alphaHistory);
    metrics.alphaMax = Math.max(...metrics.alphaHistory);
  }
}

function calculateFPS(metrics: MetricsState, deltaMs: number): number {
  metrics.frameTimes.push(deltaMs);
  if (metrics.frameTimes.length > FPS_SAMPLE_COUNT) {
    metrics.frameTimes.shift();
  }
  if (metrics.frameTimes.length === 0) return 0;
  const avg =
    metrics.frameTimes.reduce((a, b) => a + b, 0) / metrics.frameTimes.length;
  return avg > 0 ? 1000 / avg : 0;
}

function detectRefreshRate(metrics: MetricsState): number {
  if (metrics.frameTimes.length < 10) return 0;
  const sorted = [...metrics.frameTimes].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? 16.67;
  return Math.round(1000 / median);
}

function updatePhysicsRate(metrics: MetricsState): void {
  const now = performance.now();
  const elapsed = now - metrics.lastPhysicsTime;
  if (elapsed >= PHYSICS_RATE_UPDATE_INTERVAL) {
    try {
      const physics = PhysicsWorldManager.getInstance();
      const currentStepCount = physics.getStepCount();
      const stepsDelta = currentStepCount - metrics.lastPhysicsStepCount;

      // Handle physics reset (stepCount goes back to 0)
      if (stepsDelta >= 0) {
        metrics.physicsRate = (stepsDelta / elapsed) * 1000;
      }
      // On reset, keep previous rate until next valid measurement

      metrics.lastPhysicsStepCount = currentStepCount;
      metrics.lastPhysicsTime = now;
    } catch {
      metrics.physicsRate = 0;
    }
  }
}

function getInterpolationAlpha(): number {
  try {
    // Read the alpha that was captured during the game's render pass.
    // This ensures we display the same alpha value that was used for
    // actual entity interpolation, avoiding timing issues between
    // the debug console's rAF loop and the game's rAF loop.
    return PhysicsWorldManager.getInstance().getCapturedAlpha();
  } catch {
    return 0;
  }
}

function getBodyCount(): number {
  try {
    return PhysicsWorldManager.getInstance().getAllBodyIds().length;
  } catch {
    return 0;
  }
}

// ============================================================================
// DOM Creation Helpers
// ============================================================================

const MIN_WIDTH = 400;
const MIN_HEIGHT = 150;
const MAX_WIDTH = 1200;
const MAX_HEIGHT = 600;

function createContainer(state: ConsoleState): HTMLDivElement {
  const container = document.createElement('div');
  container.id = 'debug-console';
  const height = state.minimized ? HEADER_HEIGHT : state.height;
  // When minimized, disable min-height constraint so header-only height works
  const minHeight = state.minimized ? HEADER_HEIGHT : MIN_HEIGHT;
  container.style.cssText = `
    position: fixed;
    left: ${String(state.x)}px;
    top: ${String(state.y)}px;
    width: ${String(state.width)}px;
    height: ${String(height)}px;
    min-width: ${String(MIN_WIDTH)}px;
    min-height: ${String(minHeight)}px;
    max-width: ${String(MAX_WIDTH)}px;
    max-height: ${String(MAX_HEIGHT)}px;
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
    resize: ${state.minimized ? 'none' : 'both'};
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

function createMainContent(): HTMLDivElement {
  const main = document.createElement('div');
  main.style.cssText = `
    flex: 1;
    display: flex;
    overflow: hidden;
  `;
  return main;
}

function createPerfPanel(): HTMLDivElement {
  const panel = document.createElement('div');
  panel.style.cssText = `
    min-width: ${String(PERF_PANEL_WIDTH)}px;
    flex: 0 0 40%;
    max-width: 50%;
    border-right: 1px solid #333;
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  `;
  return panel;
}

// ============================================================================
// Sparkline Chart
// ============================================================================

interface SparklineState {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  values: number[];
  minVal: number;
  maxVal: number;
  color: string;
  maxSamples: number;
}

function createSparkline(color: string): SparklineState {
  const canvas = document.createElement('canvas');
  canvas.width = SPARKLINE_WIDTH * 2; // 2x for retina
  canvas.height = SPARKLINE_HEIGHT * 2;
  canvas.style.cssText = `
    flex: 1;
    min-width: ${String(SPARKLINE_WIDTH)}px;
    height: ${String(SPARKLINE_HEIGHT)}px;
    margin: 0 4px;
  `;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2d context');
  }

  return {
    canvas,
    ctx,
    values: [],
    minVal: 0,
    maxVal: 1,
    color,
    maxSamples: SPARKLINE_SAMPLES,
  };
}

function updateSparkline(
  sparkline: SparklineState,
  value: number,
  minVal?: number,
  maxVal?: number
): void {
  // Calculate max samples based on current canvas width (1 sample per 2 pixels)
  const canvasWidth = sparkline.canvas.clientWidth;
  sparkline.maxSamples = Math.max(
    SPARKLINE_SAMPLES,
    Math.floor(canvasWidth / 2)
  );

  sparkline.values.push(value);
  while (sparkline.values.length > sparkline.maxSamples) {
    sparkline.values.shift();
  }

  // Auto-scale or use provided range
  if (minVal !== undefined && maxVal !== undefined) {
    sparkline.minVal = minVal;
    sparkline.maxVal = maxVal;
  } else {
    sparkline.minVal = Math.min(...sparkline.values);
    sparkline.maxVal = Math.max(...sparkline.values);
  }

  // Add small padding to range
  const range = sparkline.maxVal - sparkline.minVal;
  if (range === 0) {
    sparkline.minVal = value - 0.5;
    sparkline.maxVal = value + 0.5;
  }

  drawSparkline(sparkline);
}

function drawSparkline(sparkline: SparklineState): void {
  const { canvas, ctx, values, minVal, maxVal, color, maxSamples } = sparkline;

  // Get actual display size and resize canvas buffer if needed
  const displayWidth = canvas.clientWidth || SPARKLINE_WIDTH;
  const displayHeight = canvas.clientHeight || SPARKLINE_HEIGHT;

  // Resize canvas buffer to match display size (2x for retina)
  const bufferWidth = displayWidth * 2;
  const bufferHeight = displayHeight * 2;
  if (canvas.width !== bufferWidth || canvas.height !== bufferHeight) {
    canvas.width = bufferWidth;
    canvas.height = bufferHeight;
    ctx.scale(2, 2);
  }

  const w = displayWidth;
  const h = displayHeight;

  // Clear
  ctx.clearRect(0, 0, w, h);

  if (values.length < 2) return;

  // Draw background grid line at middle
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(0, h / 2);
  ctx.lineTo(w, h / 2);
  ctx.stroke();

  // Draw line
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();

  const range = maxVal - minVal;
  const xStep = w / (maxSamples - 1);

  for (let i = 0; i < values.length; i++) {
    const x = i * xStep;
    const val = values[i] ?? 0;
    const normalizedY = range > 0 ? (val - minVal) / range : 0.5;
    const y = h - normalizedY * h; // Flip Y axis

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }

  ctx.stroke();

  // Draw current value dot
  if (values.length > 0) {
    const lastX = (values.length - 1) * xStep;
    const lastVal = values[values.length - 1] ?? 0;
    const normalizedY = range > 0 ? (lastVal - minVal) / range : 0.5;
    const lastY = h - normalizedY * h;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(lastX, lastY, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function createPerfRow(label: string): {
  row: HTMLDivElement;
  valueEl: HTMLSpanElement;
} {
  const row = document.createElement('div');
  row.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 18px;
  `;

  const labelEl = document.createElement('span');
  labelEl.textContent = label;
  labelEl.style.cssText = 'color: #666; font-size: 10px;';

  const valueEl = document.createElement('span');
  valueEl.textContent = '--';
  valueEl.style.cssText = `
    color: #0f0;
    font-size: 11px;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
  `;

  row.appendChild(labelEl);
  row.appendChild(valueEl);

  return { row, valueEl };
}

function createPerfRowWithChart(
  label: string,
  chartColor: string
): {
  row: HTMLDivElement;
  valueEl: HTMLSpanElement;
  sparkline: SparklineState;
} {
  const row = document.createElement('div');
  row.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 20px;
  `;

  const labelEl = document.createElement('span');
  labelEl.textContent = label;
  labelEl.style.cssText = 'color: #666; font-size: 10px; min-width: 40px;';

  const sparkline = createSparkline(chartColor);

  const valueEl = document.createElement('span');
  valueEl.textContent = '--';
  valueEl.style.cssText = `
    color: ${chartColor};
    font-size: 11px;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
    min-width: 55px;
    text-align: right;
  `;

  row.appendChild(labelEl);
  row.appendChild(sparkline.canvas);
  row.appendChild(valueEl);

  return { row, valueEl, sparkline };
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

  const startDrag = (clientX: number, clientY: number): void => {
    isDragging = true;
    dragOffsetX = clientX - state.x;
    dragOffsetY = clientY - state.y;
    document.body.style.userSelect = 'none';
  };

  const moveDrag = (clientX: number, clientY: number): void => {
    if (!isDragging) return;
    const newX = clientX - dragOffsetX;
    const newY = clientY - dragOffsetY;

    const maxX = window.innerWidth - container.offsetWidth;
    const maxY = window.innerHeight - container.offsetHeight;
    state.x = Math.max(0, Math.min(newX, maxX));
    state.y = Math.max(0, Math.min(newY, maxY));

    container.style.left = `${String(state.x)}px`;
    container.style.top = `${String(state.y)}px`;
  };

  const endDrag = (): void => {
    if (isDragging) {
      isDragging = false;
      document.body.style.userSelect = '';
      saveState(state);
    }
  };

  header.addEventListener('mousedown', (e: MouseEvent): void => {
    if ((e.target as HTMLElement).tagName === 'BUTTON') return;
    e.preventDefault();
    startDrag(e.clientX, e.clientY);
  });

  document.addEventListener('mousemove', (e: MouseEvent) => {
    moveDrag(e.clientX, e.clientY);
  });

  document.addEventListener('mouseup', endDrag);

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
    if (e.key === '`' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const target = e.target as HTMLElement;
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

      while (logLines.length > MAX_DISPLAY_LOGS) {
        const oldLine = logLines.shift();
        oldLine?.remove();
      }

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
  initConsoleCapture();

  const original = getOriginalConsole();

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
// Performance Panel Interface
// ============================================================================

interface PerfRowWithChart {
  row: HTMLDivElement;
  valueEl: HTMLSpanElement;
  sparkline: SparklineState;
}

interface PerfRowSimple {
  row: HTMLDivElement;
  valueEl: HTMLSpanElement;
}

interface PerfRows {
  fps: PerfRowWithChart;
  display: PerfRowSimple;
  physics: PerfRowWithChart;
  alpha: PerfRowWithChart;
  bodies: PerfRowSimple;
}

function createPerfRows(): PerfRows {
  return {
    fps: createPerfRowWithChart('FPS', '#0f0'),
    display: createPerfRow('Display'),
    physics: createPerfRowWithChart('Physics', '#0af'),
    alpha: createPerfRowWithChart('Alpha', '#fa0'),
    bodies: createPerfRow('Bodies'),
  };
}

function updatePerfDisplay(
  rows: PerfRows,
  metrics: MetricsState,
  deltaMs: number
): void {
  const fps = calculateFPS(metrics, deltaMs);
  const refreshRate = detectRefreshRate(metrics);
  updatePhysicsRate(metrics);
  const alpha = getInterpolationAlpha();
  const bodies = getBodyCount();

  // Record telemetry for diagnostic export
  recordTelemetry({
    fps,
    physicsHz: metrics.physicsRate,
    alpha,
    bodies,
    deltaMs,
  });

  // Track alpha min/max
  updateAlphaStats(metrics, alpha);

  // Update FPS with chart
  rows.fps.valueEl.textContent = fps.toFixed(1);
  const fpsColor = fps < 30 ? '#f66' : fps < 55 ? '#ff0' : '#0f0';
  rows.fps.valueEl.style.color = fpsColor;
  rows.fps.sparkline.color = fpsColor;
  updateSparkline(rows.fps.sparkline, fps, 0, 144);

  // Display rate (no chart)
  rows.display.valueEl.textContent =
    refreshRate > 0 ? String(refreshRate) + ' Hz' : '--';

  // Physics rate with chart
  rows.physics.valueEl.textContent =
    metrics.physicsRate > 0 ? metrics.physicsRate.toFixed(1) + ' Hz' : '--';
  updateSparkline(rows.physics.sparkline, metrics.physicsRate, 0, 80);

  // Alpha with chart - show min-max range
  const alphaRange =
    metrics.alphaMin.toFixed(2) + '-' + metrics.alphaMax.toFixed(2);
  rows.alpha.valueEl.textContent = alphaRange;
  updateSparkline(rows.alpha.sparkline, alpha, 0, 1);

  // Bodies count (no chart)
  rows.bodies.valueEl.textContent = String(bodies);
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
  const state = loadState();
  const metrics = createMetricsState();

  // Create DOM structure
  const container = createContainer(state);
  const header = createHeader();
  const headerTitle = createHeaderTitle();
  const headerButtons = createHeaderButtons();
  const mainContent = createMainContent();
  const perfPanel = createPerfPanel();
  const perfRows = createPerfRows();
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
      if (state.minimized) {
        container.style.height = `${String(HEADER_HEIGHT)}px`;
        container.style.minHeight = `${String(HEADER_HEIGHT)}px`;
        container.style.resize = 'none';
      } else {
        container.style.height = `${String(state.height)}px`;
        container.style.minHeight = `${String(MIN_HEIGHT)}px`;
        container.style.resize = 'both';
      }
      minimizeBtn.textContent = state.minimized ? '+' : '-';
      mainContent.style.display = state.minimized ? 'none' : 'flex';
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

  // Assemble perf panel
  perfPanel.appendChild(perfRows.fps.row);
  perfPanel.appendChild(perfRows.display.row);
  perfPanel.appendChild(perfRows.physics.row);
  perfPanel.appendChild(perfRows.alpha.row);
  perfPanel.appendChild(perfRows.bodies.row);

  // Assemble header
  headerButtons.appendChild(minimizeBtn);
  headerButtons.appendChild(closeBtn);
  header.appendChild(headerTitle);
  header.appendChild(headerButtons);

  // Assemble main content
  mainContent.appendChild(perfPanel);
  mainContent.appendChild(logArea);

  // Assemble footer
  footer.appendChild(copyBtn);
  footer.appendChild(clearBtn);
  footer.appendChild(reportBtn);

  // Assemble container
  container.appendChild(header);
  container.appendChild(mainContent);
  container.appendChild(footer);

  // Apply minimized state
  if (state.minimized) {
    mainContent.style.display = 'none';
    footer.style.display = 'none';
  }

  // Setup behaviors
  setupDragging(container, header, state);
  setupKeyboardShortcut(container, state);
  setupConsoleIntegration(logManager);

  // Track resize and save dimensions
  let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      if (!state.minimized) {
        state.width = entry.contentRect.width;
        state.height = entry.contentRect.height;

        // Debounce save to localStorage
        if (resizeTimeout) clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
          saveState(state);
        }, 200);
      }
    }
  });
  resizeObserver.observe(container);

  // Performance update loop
  function updateLoop(): void {
    const now = performance.now();
    const deltaMs = now - metrics.lastTime;
    metrics.lastTime = now;

    if (state.visible && !state.minimized) {
      updatePerfDisplay(perfRows, metrics, deltaMs);
    }

    requestAnimationFrame(updateLoop);
  }

  requestAnimationFrame(updateLoop);

  return container;
}
