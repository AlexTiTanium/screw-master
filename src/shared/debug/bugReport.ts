/**
 * Bug Report Client
 *
 * This module provides functions to capture game state, screenshots, and logs,
 * then submit them to the Vite dev server for saving as bug reports.
 *
 * @example
 * // Show the bug report modal when user clicks "Report Bug"
 * import { showBugReportModal } from '@shared/debug/bugReport';
 * reportButton.onclick = () => showBugReportModal();
 *
 * @module
 */

/* eslint-disable jsdoc/require-returns, jsdoc/require-param, jsdoc/require-example */
/* eslint-disable max-lines-per-function */
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { RecordedAction } from './types';
import { getCapturedLogs, type CapturedLog } from './consoleCapture';
import { getRecordedActions } from './harness/actionDsl';

/**
 * Snapshot of a display object from the PixiJS render tree.
 */
export interface DisplayObjectSnapshot {
  /** Type of the display object */
  type: string;
  /** PixiJS internal uid for this display object */
  uid?: string;
  /** Label/identifier (if available) */
  label?: string;
  /** Entity UID if this display object is an ODIE Entity2D */
  entityUid?: string;
  /** Position in world coordinates */
  position: { x: number; y: number };
  /** Scale */
  scale: { x: number; y: number };
  /** Rotation in radians */
  rotation: number;
  /** Visibility */
  visible: boolean;
  /** Alpha/opacity */
  alpha: number;
  /** Bounds (if calculable) */
  bounds?: { x: number; y: number; width: number; height: number };
  /** Texture key/path (for sprites) */
  texture?: string;
  /** Child display objects */
  children?: DisplayObjectSnapshot[];
}

/**
 * Full render state including display tree and ECS entities.
 */
export interface RenderState {
  /** Performance timestamp */
  timestamp: number;
  /** Display object hierarchy */
  displayTree: DisplayObjectSnapshot;
  /** Number of display objects in tree */
  displayObjectCount: number;
  /** ECS entity data (if test harness available) */
  entities?: {
    id: string;
    type: string;
    position: { x: number; y: number };
    components: Record<string, unknown>;
  }[];
  /** Scene state */
  sceneState: 'running' | 'paused' | 'stopped' | 'unknown';
}

/**
 * Complete bug report data structure.
 */
export interface BugReport {
  /** ISO timestamp when the report was created */
  timestamp: string;
  /** Current URL including query parameters */
  url: string;
  /** Optional user description of the bug */
  description?: string;
  /** Base64-encoded PNG screenshot */
  screenshot: string;
  /** Full render state including display tree */
  gameState: RenderState | null;
  /** Captured console logs */
  consoleLogs: CapturedLog[];
  /** Recorded user actions */
  userActions: RecordedAction[];
}

/**
 * Response from the bug report API endpoint.
 */
export interface BugReportResponse {
  /** Whether the report was saved successfully */
  success: boolean;
  /** Path where the report was saved (on success) */
  path?: string;
  /** Error message (on failure) */
  error?: string;
}

/**
 * Get the PixiJS renderer from the Astro app.
 * Dynamically imports to avoid circular dependency issues.
 */
async function getPixiRenderer(): Promise<any> {
  try {
    const { getApp } = await import('@app/bootstrap');
    const { StagePlugin } = await import('@play-co/astro');
    const app = getApp();
    if (!app) return null;
    const stage = app.get(StagePlugin);
    return (stage as any).renderer ?? null;
  } catch {
    return null;
  }
}

/**
 * Get the PixiJS stage from the Astro app.
 */
async function getPixiStage(): Promise<any> {
  try {
    const { getApp } = await import('@app/bootstrap');
    const { StagePlugin } = await import('@play-co/astro');
    const app = getApp();
    if (!app) return null;
    const stage = app.get(StagePlugin);
    return (stage as any).stage ?? null;
  } catch {
    return null;
  }
}

/**
 * Capture a screenshot of the game canvas using PixiJS extract.
 *
 * Uses renderer.extract.base64() for proper WebGL screenshot capture.
 * Falls back to canvas.toDataURL() if extract is unavailable.
 *
 * @returns Base64-encoded PNG data URL
 * @throws Error if canvas is not found
 *
 * @example
 * const screenshot = await captureScreenshot();
 */
export async function captureScreenshot(): Promise<string> {
  // Try PixiJS renderer extract first (works with WebGL)
  const renderer = await getPixiRenderer();
  const stage = await getPixiStage();

  if (renderer?.extract && stage) {
    try {
      // Use PixiJS extract to get base64 PNG
      const base64 = await renderer.extract.base64(stage, 'image/png');
      return base64;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(
        '[BugReport] Extract failed, falling back to toDataURL:',
        error
      );
    }
  }

  // Fallback to direct canvas access
  const canvas = document.querySelector<HTMLCanvasElement>('canvas');
  if (!canvas) {
    throw new Error('Canvas not found');
  }

  return canvas.toDataURL('image/png');
}

/**
 * Snapshot a PixiJS display object to a plain object.
 */
function snapshotDisplayObject(
  displayObject: any,
  depth = 0,
  maxDepth = 10
): DisplayObjectSnapshot | null {
  if (!displayObject || depth > maxDepth) return null;

  const snapshot: DisplayObjectSnapshot = {
    type: displayObject.constructor?.name ?? 'Unknown',
    position: {
      x: displayObject.x ?? 0,
      y: displayObject.y ?? 0,
    },
    scale: {
      x: displayObject.scale?.x ?? 1,
      y: displayObject.scale?.y ?? 1,
    },
    rotation: displayObject.rotation ?? 0,
    visible: displayObject.visible ?? true,
    alpha: displayObject.alpha ?? 1,
  };

  // Add PixiJS internal uid for correlation with view2d.viewUid
  if (displayObject.uid !== undefined) {
    snapshot.uid = String(displayObject.uid);
  }

  // Add label if available
  if (displayObject.label) {
    snapshot.label = displayObject.label;
  }

  // Add entity UID if this is an ODIE Entity2D (has UID property)
  if (displayObject.UID !== undefined) {
    snapshot.entityUid = String(displayObject.UID);
  }

  // Try to get bounds
  try {
    if (typeof displayObject.getBounds === 'function') {
      const b = displayObject.getBounds();
      if (b && typeof b.x === 'number') {
        snapshot.bounds = {
          x: b.x,
          y: b.y,
          width: b.width,
          height: b.height,
        };
      }
    }
  } catch {
    // Ignore bounds errors
  }

  // Get texture info for sprites
  if (displayObject.texture) {
    const tex = displayObject.texture;
    snapshot.texture = tex.label ?? tex.uid ?? 'texture';
  }

  // Process children
  if (displayObject.children && displayObject.children.length > 0) {
    const children: DisplayObjectSnapshot[] = [];
    for (const child of displayObject.children) {
      const childSnapshot = snapshotDisplayObject(child, depth + 1, maxDepth);
      if (childSnapshot) {
        children.push(childSnapshot);
      }
    }
    if (children.length > 0) {
      snapshot.children = children;
    }
  }

  return snapshot;
}

/**
 * Count total display objects in a snapshot tree.
 */
function countDisplayObjects(snapshot: DisplayObjectSnapshot): number {
  let count = 1;
  if (snapshot.children) {
    for (const child of snapshot.children) {
      count += countDisplayObjects(child);
    }
  }
  return count;
}

/**
 * Capture the full render state including display tree.
 */
async function captureRenderState(): Promise<RenderState | null> {
  const stage = await getPixiStage();
  if (!stage) {
    return null;
  }

  // Capture display tree
  const displayTree = snapshotDisplayObject(stage);
  if (!displayTree) {
    return null;
  }

  // Get entity data from test harness if available
  let entities: RenderState['entities'];
  let sceneState: RenderState['sceneState'] = 'unknown';

  if (window.__gameTest) {
    const sig = window.__gameTest.getRenderSignature();
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (sig) {
      sceneState = sig.sceneState;
      entities = sig.entities.map((e) => ({
        id: String(e.id),
        type: e.type,
        position: e.position,
        components: e.components,
      }));
    }
  }

  const renderState: RenderState = {
    timestamp: performance.now(),
    displayTree,
    displayObjectCount: countDisplayObjects(displayTree),
    sceneState,
  };

  // Only add entities if they exist
  if (entities) {
    renderState.entities = entities;
  }

  return renderState;
}

/**
 * Collect all bug report data.
 *
 * @param description - Optional user description of the bug
 * @returns Complete bug report data
 *
 * @example
 * const report = await collectBugReport('Red screw went to wrong tray');
 */
export async function collectBugReport(
  description?: string
): Promise<BugReport> {
  // Pause the game to capture stable state
  await window.__gameTest?.act({ type: 'pause' });

  // Capture screenshot using PixiJS extract
  let screenshot = '';
  try {
    screenshot = await captureScreenshot();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[BugReport] Failed to capture screenshot:', error);
  }

  // Capture full render state including display tree
  const gameState = await captureRenderState();

  // Get console logs
  const consoleLogs = getCapturedLogs();

  // Get recorded user actions
  const userActions = getRecordedActions();

  // Resume the game
  await window.__gameTest?.act({ type: 'resume' });

  const report: BugReport = {
    timestamp: new Date().toISOString(),
    url: window.location.href,
    screenshot,
    gameState,
    consoleLogs,
    userActions,
  };

  // Only add description if provided
  if (description) {
    report.description = description;
  }

  return report;
}

/**
 * Submit a bug report to the dev server.
 *
 * @param report - The bug report to submit
 * @returns API response indicating success or failure
 *
 * @example
 * const report = await collectBugReport('Bug description');
 * const result = await submitBugReport(report);
 * if (result.success) {
 *   console.log('Report saved to:', result.path);
 * }
 */
export async function submitBugReport(
  report: BugReport
): Promise<BugReportResponse> {
  try {
    const response = await fetch('/__bug-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
    });

    const result = (await response.json()) as BugReportResponse;
    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ============================================================================
// Bug Report Modal UI
// ============================================================================

/** Reference to the current modal element */
let currentModal: HTMLElement | null = null;

/**
 * Create the modal overlay element.
 */
function createModalOverlay(): HTMLDivElement {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;
  return overlay;
}

/**
 * Create the modal content container.
 */
function createModalContent(): HTMLDivElement {
  const content = document.createElement('div');
  content.style.cssText = `
    background: #1a1a1a;
    border: 1px solid #333;
    border-radius: 8px;
    padding: 20px;
    width: 400px;
    max-width: 90vw;
    color: #fff;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;
  return content;
}

/**
 * Create the modal title.
 */
function createModalTitle(): HTMLHeadingElement {
  const title = document.createElement('h2');
  title.textContent = 'Report Bug';
  title.style.cssText = `
    margin: 0 0 16px 0;
    font-size: 18px;
    font-weight: 600;
  `;
  return title;
}

/**
 * Create the description textarea.
 */
function createDescriptionTextarea(): HTMLTextAreaElement {
  const textarea = document.createElement('textarea');
  textarea.placeholder = 'Describe the bug (optional)...';
  textarea.style.cssText = `
    width: 100%;
    height: 100px;
    padding: 10px;
    border: 1px solid #444;
    border-radius: 4px;
    background: #222;
    color: #fff;
    font-family: inherit;
    font-size: 14px;
    resize: vertical;
    box-sizing: border-box;
  `;
  return textarea;
}

/**
 * Create a button element.
 */
function createButton(text: string, isPrimary: boolean): HTMLButtonElement {
  const button = document.createElement('button');
  button.textContent = text;
  button.style.cssText = `
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
    transition: background 0.2s;
    ${
      isPrimary
        ? 'background: #4CAF50; color: white;'
        : 'background: #444; color: #ddd;'
    }
  `;
  button.onmouseenter = (): void => {
    button.style.background = isPrimary ? '#45a049' : '#555';
  };
  button.onmouseleave = (): void => {
    button.style.background = isPrimary ? '#4CAF50' : '#444';
  };
  return button;
}

/**
 * Create the button container.
 */
function createButtonContainer(): HTMLDivElement {
  const container = document.createElement('div');
  container.style.cssText = `
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 16px;
  `;
  return container;
}

/**
 * Create the status message element.
 */
function createStatusMessage(): HTMLDivElement {
  const status = document.createElement('div');
  status.style.cssText = `
    margin-top: 12px;
    padding: 10px;
    border-radius: 4px;
    font-size: 14px;
    display: none;
  `;
  return status;
}

/**
 * Show a status message in the modal.
 */
function showStatus(
  element: HTMLDivElement,
  message: string,
  isError: boolean
): void {
  element.textContent = message;
  element.style.display = 'block';
  element.style.background = isError ? '#5c2020' : '#1e3a1e';
  element.style.color = isError ? '#ff8080' : '#80ff80';
}

/**
 * Close and remove the modal.
 */
function closeModal(): void {
  if (currentModal) {
    currentModal.remove();
    currentModal = null;
  }
}

/**
 * Show the bug report modal.
 * Allows user to add an optional description before submitting.
 *
 * @example
 * // Show modal when user clicks Report Bug button
 * reportButton.onclick = () => showBugReportModal();
 */
export function showBugReportModal(): void {
  // Close any existing modal
  closeModal();

  // Create modal elements
  const overlay = createModalOverlay();
  const content = createModalContent();
  const title = createModalTitle();
  const textarea = createDescriptionTextarea();
  const buttonContainer = createButtonContainer();
  const cancelButton = createButton('Cancel', false);
  const submitButton = createButton('Submit Report', true);
  const statusMessage = createStatusMessage();

  // Assemble modal
  buttonContainer.appendChild(cancelButton);
  buttonContainer.appendChild(submitButton);
  content.appendChild(title);
  content.appendChild(textarea);
  content.appendChild(buttonContainer);
  content.appendChild(statusMessage);
  overlay.appendChild(content);

  // Handle cancel
  cancelButton.onclick = closeModal;
  overlay.onclick = (e): void => {
    if (e.target === overlay) {
      closeModal();
    }
  };

  // Handle submit
  submitButton.onclick = async (): Promise<void> => {
    // Disable buttons during submission
    submitButton.disabled = true;
    cancelButton.disabled = true;
    submitButton.textContent = 'Submitting...';
    submitButton.style.background = '#666';

    try {
      // Collect and submit report
      const description = textarea.value.trim() || undefined;
      const report = await collectBugReport(description);
      const result = await submitBugReport(report);

      if (result.success) {
        showStatus(
          statusMessage,
          `Report saved to: ${result.path ?? 'unknown'}`,
          false
        );
        // Auto-close after success
        setTimeout(closeModal, 2000);
      } else {
        showStatus(
          statusMessage,
          `Error: ${result.error ?? 'Unknown error'}`,
          true
        );
        // Re-enable buttons on error
        submitButton.disabled = false;
        cancelButton.disabled = false;
        submitButton.textContent = 'Submit Report';
        submitButton.style.background = '#4CAF50';
      }
    } catch (error) {
      showStatus(
        statusMessage,
        `Error: ${error instanceof Error ? error.message : String(error)}`,
        true
      );
      // Re-enable buttons on error
      submitButton.disabled = false;
      cancelButton.disabled = false;
      submitButton.textContent = 'Submit Report';
      submitButton.style.background = '#4CAF50';
    }
  };

  // Add to DOM and focus textarea
  document.body.appendChild(overlay);
  currentModal = overlay;
  textarea.focus();
}
