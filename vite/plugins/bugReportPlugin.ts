/**
 * Vite Plugin for Bug Report API
 *
 * This plugin adds a REST API endpoint to the Vite dev server for saving
 * bug reports submitted from the game client. Reports are saved to the
 * `bug-reports/` directory with screenshots, game state, and logs.
 *
 * @example
 * // In vite.config.ts
 * import { bugReportPlugin } from './vite/plugins/bugReportPlugin';
 *
 * export default defineConfig({
 *   plugins: [bugReportPlugin()],
 * });
 *
 * @module
 */

import type { Plugin, Connect } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { execSync } from 'node:child_process';

/**
 * Get the current git commit hash.
 * Returns 'unknown' if git is not available or not in a git repo.
 */
function getGitCommitHash(): string {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return 'unknown';
  }
}

/**
 * Get the current git branch name.
 * Returns 'unknown' if git is not available or not in a git repo.
 */
function getGitBranch(): string {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf-8',
    }).trim();
  } catch {
    return 'unknown';
  }
}

/**
 * Check if there are uncommitted changes in the working directory.
 */
function hasUncommittedChanges(): boolean {
  try {
    const status = execSync('git status --porcelain', {
      encoding: 'utf-8',
    }).trim();
    return status.length > 0;
  } catch {
    return false;
  }
}

/**
 * Telemetry sample from performance monitor.
 */
interface TelemetrySample {
  t: number;
  fps: number;
  physicsHz: number;
  alpha: number;
  bodies: number;
  deltaMs: number;
}

/** Statistics for a metric */
interface MetricStats {
  min: number;
  max: number;
  avg: number;
  median: number;
  stdDev: number;
  p95: number;
  p99: number;
}

/** Alpha distribution buckets */
interface AlphaDistribution {
  low: number;
  normal: number;
  high: number;
  veryHigh: number;
}

/** Frame timing analysis */
interface FrameTimingAnalysis {
  deltaMs: MetricStats;
  droppedFrames: number;
  majorStalls: number;
}

/**
 * Structure of the bug report request body.
 */
interface BugReportRequest {
  /** ISO timestamp when the report was created */
  timestamp: string;
  /** Current URL including query parameters */
  url: string;
  /** Optional user description of the bug */
  description?: string;
  /** Base64-encoded PNG screenshot */
  screenshot: string;
  /** Game state from getRenderSignature() */
  gameState: unknown;
  /** Captured console logs */
  consoleLogs: Array<{
    type: 'log' | 'warn' | 'error';
    timestamp: number;
    tick: number;
    args: string[];
  }>;
  /** Recorded user actions */
  userActions: Array<{
    action: unknown;
    tick: number;
    timestamp: number;
  }>;
  /** Performance telemetry data */
  telemetry?: {
    version: number;
    captureStart: string;
    duration: number;
    sampleCount: number;
    summary: {
      fps: MetricStats;
      alpha: MetricStats;
      physicsHz: MetricStats;
    };
    alphaDistribution: AlphaDistribution;
    frameTiming: FrameTimingAnalysis;
    samples: TelemetrySample[];
  };
}

/**
 * Parse the JSON request body from an incoming request.
 */
async function parseRequestBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: Buffer) => {
      body += chunk.toString();
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

/**
 * Format timestamp for use in folder names (replace colons and dots).
 */
function formatTimestampForFolder(timestamp: string): string {
  return timestamp.replace(/[:.]/g, '-');
}

/**
 * Format console logs as human-readable text.
 */
function formatConsoleLogs(
  logs: BugReportRequest['consoleLogs']
): string {
  return logs
    .map((log) => {
      const tickStr = log.tick >= 0 ? `T${log.tick}` : '---';
      const timeStr = log.timestamp.toFixed(0).padStart(8);
      const typeStr = log.type.toUpperCase().padEnd(5);
      const message = log.args.join(' ');
      return `[${timeStr}ms] [${tickStr}] [${typeStr}] ${message}`;
    })
    .join('\n');
}

/**
 * Handle the bug report POST request.
 */
async function handleBugReport(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  try {
    // Parse request body
    const bodyStr = await parseRequestBody(req);
    const report = JSON.parse(bodyStr) as BugReportRequest;

    // Create timestamped folder
    const folderName = formatTimestampForFolder(report.timestamp);
    const reportDir = join(process.cwd(), 'bug-reports', folderName);
    await mkdir(reportDir, { recursive: true });

    // Save screenshot (decode base64)
    if (report.screenshot) {
      const screenshotData = report.screenshot.replace(
        /^data:image\/png;base64,/,
        ''
      );
      await writeFile(
        join(reportDir, 'screenshot.png'),
        Buffer.from(screenshotData, 'base64')
      );
    }

    // Save game state (extract displayTree to separate file)
    const gameState = report.gameState as Record<string, unknown> | null;
    if (gameState) {
      // Save displayTree separately as render-graph.json
      if (gameState.displayTree) {
        await writeFile(
          join(reportDir, 'render-graph.json'),
          JSON.stringify(gameState.displayTree, null, 2)
        );
        // Remove from game-state to avoid duplication
        const { displayTree: _, ...stateWithoutTree } = gameState;
        await writeFile(
          join(reportDir, 'game-state.json'),
          JSON.stringify(stateWithoutTree, null, 2)
        );
      } else {
        await writeFile(
          join(reportDir, 'game-state.json'),
          JSON.stringify(gameState, null, 2)
        );
      }
    }

    // Save console logs as formatted text
    const logText = formatConsoleLogs(report.consoleLogs);
    await writeFile(join(reportDir, 'console-log.txt'), logText);

    // Save metadata (URL, description, user actions, git info)
    await writeFile(
      join(reportDir, 'report.json'),
      JSON.stringify(
        {
          timestamp: report.timestamp,
          url: report.url,
          description: report.description ?? null,
          git: {
            commit: getGitCommitHash(),
            branch: getGitBranch(),
            dirty: hasUncommittedChanges(),
          },
          userActions: report.userActions,
        },
        null,
        2
      )
    );

    // Save telemetry diagnostic data
    if (report.telemetry) {
      await writeFile(
        join(reportDir, 'diagnostic.json'),
        JSON.stringify(report.telemetry, null, 2)
      );
    }

    // Log success to server console
    // eslint-disable-next-line no-console
    console.log(`[BugReport] Saved report to: ${reportDir}`);

    // Send success response
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, path: reportDir }));
  } catch (error) {
    // Log error to server console
    // eslint-disable-next-line no-console
    console.error('[BugReport] Error saving report:', error);

    // Send error response
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      })
    );
  }
}

/**
 * Create the bug report middleware handler.
 */
function createBugReportMiddleware(): Connect.NextHandleFunction {
  return (
    req: IncomingMessage,
    res: ServerResponse,
    next: Connect.NextFunction
  ): void => {
    // Only handle POST requests to /__bug-report
    if (req.url !== '/__bug-report' || req.method !== 'POST') {
      next();
      return;
    }

    // Handle the bug report (async)
    void handleBugReport(req, res);
  };
}

/**
 * Vite plugin that adds bug report API endpoint.
 *
 * Adds a `POST /__bug-report` endpoint to the dev server that saves
 * bug reports to the `bug-reports/` directory.
 *
 * @returns Vite plugin configuration
 *
 * @example
 * // vite.config.ts
 * import { bugReportPlugin } from './vite/plugins/bugReportPlugin';
 *
 * export default defineConfig({
 *   plugins: [bugReportPlugin()],
 * });
 */
export function bugReportPlugin(): Plugin {
  return {
    name: 'bug-report-plugin',

    configureServer(server) {
      // Add middleware to handle bug report requests
      server.middlewares.use(createBugReportMiddleware());

      // Log that the plugin is active
      // eslint-disable-next-line no-console
      console.log('[BugReport] Plugin active - POST /__bug-report endpoint ready');
    },
  };
}
