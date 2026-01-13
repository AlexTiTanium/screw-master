/**
 * Diagnostic Telemetry Capture
 *
 * Captures performance metrics history for debugging purposes.
 * Data is included in bug reports as diagnostic.json.
 *
 * @module
 */

/* eslint-disable jsdoc/require-param, jsdoc/require-returns, jsdoc/require-example */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable max-lines-per-function */

/** Single telemetry sample */
export interface TelemetrySample {
  /** Timestamp in ms since page load */
  t: number;
  /** FPS at this sample */
  fps: number;
  /** Physics rate in Hz */
  physicsHz: number;
  /** Interpolation alpha [0-1] */
  alpha: number;
  /** Number of physics bodies */
  bodies: number;
  /** Frame delta in ms */
  deltaMs: number;
}

/** Telemetry state with circular buffer */
interface TelemetryState {
  samples: TelemetrySample[];
  maxSamples: number;
  startTime: number;
  enabled: boolean;
}

/** Global telemetry state */
const state: TelemetryState = {
  samples: [],
  maxSamples: 300, // ~5 seconds at 60fps, ~2.5 seconds at 120fps
  startTime: performance.now(),
  enabled: true,
};

/**
 * Record a telemetry sample.
 *
 * @param sample - Partial sample data (timestamp auto-filled)
 */
export function recordTelemetry(sample: Omit<TelemetrySample, 't'>): void {
  if (!state.enabled) return;

  state.samples.push({
    t: Math.round(performance.now() - state.startTime),
    ...sample,
  });

  // Circular buffer - remove oldest when full
  while (state.samples.length > state.maxSamples) {
    state.samples.shift();
  }
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
  /** Count of samples with alpha in [0, 0.4) - just after physics step */
  low: number;
  /** Count of samples with alpha in [0.4, 0.7) - normal range */
  normal: number;
  /** Count of samples with alpha in [0.7, 0.9) - approaching next physics step */
  high: number;
  /** Count of samples with alpha >= 0.9 - right before physics step */
  veryHigh: number;
}

/** Frame timing analysis */
interface FrameTimingAnalysis {
  /** Stats for frame delta times */
  deltaMs: MetricStats;
  /** Count of frames that took longer than expected (>10ms at 120Hz) */
  droppedFrames: number;
  /** Count of frames that were significantly delayed (>20ms) */
  majorStalls: number;
}

/** Alpha stability/choppiness analysis */
interface AlphaChoppiness {
  /**
   * Choppiness score [0-1]. Lower is better.
   * 0 = perfectly smooth sawtooth, 1 = completely chaotic.
   * Measures how much alpha deviates from expected sawtooth pattern.
   */
  score: number;
  /** Count of "unexpected" alpha jumps (direction reversals outside physics step) */
  unexpectedJumps: number;
  /** Count of frames where alpha stayed nearly identical (stuck) */
  stuckFrames: number;
  /** Count of long stuck runs (3+ consecutive stuck frames - indicates real problem) */
  longStuckRuns: number;
  /** Average frame-to-frame alpha change magnitude */
  avgDelta: number;
  /** Standard deviation of frame-to-frame alpha changes */
  deltaStdDev: number;
}

/**
 * Calculate percentile value from sorted array.
 */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))]!;
}

/**
 * Calculate standard deviation.
 */
function stdDev(arr: number[], avg: number): number {
  if (arr.length === 0) return 0;
  const squareDiffs = arr.map((value) => Math.pow(value - avg, 2));
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / arr.length;
  return Math.sqrt(avgSquareDiff);
}

/**
 * Calculate full statistics for an array of numbers.
 */
function calcStats(arr: number[]): MetricStats {
  if (arr.length === 0) {
    return { min: 0, max: 0, avg: 0, median: 0, stdDev: 0, p95: 0, p99: 0 };
  }

  const sorted = [...arr].sort((a, b) => a - b);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const min = sorted[0]!;
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const max = sorted[sorted.length - 1]!;
  const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
  const median = percentile(sorted, 50);
  const sd = stdDev(arr, avg);
  const p95 = percentile(sorted, 95);
  const p99 = percentile(sorted, 99);

  const round = (n: number) => Math.round(n * 1000) / 1000;

  return {
    min: round(min),
    max: round(max),
    avg: round(avg),
    median: round(median),
    stdDev: round(sd),
    p95: round(p95),
    p99: round(p99),
  };
}

/**
 * Analyze alpha distribution to diagnose timing issues.
 *
 * For 120Hz display with 60Hz physics:
 * - Physics steps every ~2 frames (16.67ms)
 * - Alpha oscillates in a sawtooth pattern:
 *   - Frame 1: accumulator = 8.33ms, alpha ≈ 0.5
 *   - Frame 2: accumulator = 16.66ms, alpha ≈ 1.0, then step → leftover ≈ 0
 * - Expected distribution: roughly even across [0.4, 1.0)
 */
function analyzeAlphaDistribution(
  samples: TelemetrySample[]
): AlphaDistribution {
  let low = 0;
  let normal = 0;
  let high = 0;
  let veryHigh = 0;

  for (const s of samples) {
    if (s.alpha < 0.4) low++;
    else if (s.alpha < 0.7) normal++;
    else if (s.alpha < 0.9) high++;
    else veryHigh++;
  }

  return { low, normal, high, veryHigh };
}

/**
 * Analyze frame timing for stalls and drops.
 */
function analyzeFrameTiming(samples: TelemetrySample[]): FrameTimingAnalysis {
  const deltaTimes = samples.map((s) => s.deltaMs);
  const stats = calcStats(deltaTimes);

  // Count problematic frames
  // At 120Hz, expected frame time is ~8.3ms
  // At 60Hz, expected frame time is ~16.7ms
  // >10ms suggests a frame drop at 120Hz
  // >20ms suggests a major stall
  let droppedFrames = 0;
  let majorStalls = 0;

  for (const dt of deltaTimes) {
    if (dt > 20) majorStalls++;
    else if (dt > 10) droppedFrames++;
  }

  return { deltaMs: stats, droppedFrames, majorStalls };
}

/**
 * Analyze alpha choppiness/stability.
 *
 * Note: The debug console samples at display refresh rate (e.g., 120Hz) but
 * the game only captures a new alpha value at 60Hz. This means ~50% of samples
 * will show the same alpha value, which is NORMAL behavior.
 *
 * Real problems are indicated by:
 * - Long runs of stuck frames (3+ consecutive)
 * - Small unexpected negative deltas (alpha going backwards)
 * - Erratic patterns that don't match sawtooth shape
 */
function analyzeAlphaChoppiness(samples: TelemetrySample[]): AlphaChoppiness {
  if (samples.length < 2) {
    return {
      score: 0,
      unexpectedJumps: 0,
      stuckFrames: 0,
      longStuckRuns: 0,
      avgDelta: 0,
      deltaStdDev: 0,
    };
  }

  const deltas: number[] = [];
  let unexpectedJumps = 0;
  let stuckFrames = 0;
  let longStuckRuns = 0;
  let currentStuckRun = 0;

  const STUCK_THRESHOLD = 0.01; // Alpha change < 1% is "stuck"
  const LARGE_NEGATIVE_THRESHOLD = -0.3; // Expected physics step reset
  const LONG_STUCK_THRESHOLD = 5; // 5+ consecutive stuck frames is problematic
  // (At 120Hz display with 60Hz physics, we expect ~50% stuck frames.
  //  Occasional runs of 3-4 stuck frames can occur due to timing jitter.
  //  5+ indicates a real problem like physics stall or tab switch.)

  for (let i = 1; i < samples.length; i++) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const prev = samples[i - 1]!;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const curr = samples[i]!;
    const delta = curr.alpha - prev.alpha;
    deltas.push(delta);

    // Check for stuck frames (alpha not changing)
    if (Math.abs(delta) < STUCK_THRESHOLD) {
      stuckFrames++;
      currentStuckRun++;
    } else {
      // End of stuck run - check if it was long
      if (currentStuckRun >= LONG_STUCK_THRESHOLD) {
        longStuckRuns++;
      }
      currentStuckRun = 0;
    }

    // Check for unexpected jumps
    // Expected: small positive (alpha increasing) or large negative (physics step reset)
    // Unexpected: small negative, or very large positive
    if (delta < 0 && delta > LARGE_NEGATIVE_THRESHOLD) {
      // Small negative delta - alpha went backwards without a physics step
      unexpectedJumps++;
    } else if (delta > 0.6) {
      // Very large positive jump - shouldn't happen in normal operation
      unexpectedJumps++;
    }
  }

  // Check final stuck run
  if (currentStuckRun >= LONG_STUCK_THRESHOLD) {
    longStuckRuns++;
  }

  // Calculate delta statistics
  const avgDelta =
    deltas.length > 0 ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 0;
  const deltaVariance =
    deltas.length > 0
      ? deltas.reduce((sum, d) => sum + Math.pow(d - avgDelta, 2), 0) /
        deltas.length
      : 0;
  const deltaSD = Math.sqrt(deltaVariance);

  // Calculate choppiness score [0-1]
  // Factors:
  // 1. Unexpected jumps ratio (weight: 50%) - most important
  // 2. Long stuck runs (weight: 30%) - indicates real stalls
  // 3. Delta standard deviation normalized (weight: 20%)
  //
  // Note: We DON'T penalize normal stuck frames (~50%) since that's expected
  // when debug console samples at 2x the game update rate.
  const jumpRatio = unexpectedJumps / deltas.length;
  const longStuckPenalty = Math.min(1, longStuckRuns / 10); // 10+ long runs = max penalty
  // Normalize stdDev: expect ~0.3-0.5 for good sawtooth, penalize higher
  const normalizedStdDev = Math.min(1, deltaSD / 0.5);

  const score = Math.min(
    1,
    jumpRatio * 0.5 + longStuckPenalty * 0.3 + normalizedStdDev * 0.2
  );

  const round = (n: number) => Math.round(n * 1000) / 1000;

  return {
    score: round(score),
    unexpectedJumps,
    stuckFrames,
    longStuckRuns,
    avgDelta: round(avgDelta),
    deltaStdDev: round(deltaSD),
  };
}

/**
 * Filter samples to exclude those affected by major stalls.
 *
 * When the bug report button is pressed (or tab switch occurs), there's typically
 * a 50ms+ stall followed by stuck alpha values. These samples pollute the
 * choppiness analysis, so we exclude:
 * - The stall frame itself (deltaMs > 20ms)
 * - All subsequent frames (often stuck due to game loop pause)
 *
 * This gives a more accurate picture of normal operation.
 */
function filterSamplesExcludingStalls(
  samples: TelemetrySample[]
): TelemetrySample[] {
  const STALL_THRESHOLD = 20; // ms

  // Find the first major stall
  const stallIndex = samples.findIndex((s) => s.deltaMs > STALL_THRESHOLD);

  // If no stall found, return all samples
  if (stallIndex === -1) {
    return samples;
  }

  // Return only samples before the stall
  return samples.slice(0, stallIndex);
}

/**
 * Get telemetry data for export.
 *
 * @returns Telemetry export object with comprehensive statistics
 */
export function getTelemetryExport(): {
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
  alphaChoppiness: AlphaChoppiness;
  frameTiming: FrameTimingAnalysis;
  samples: TelemetrySample[];
  filteredSampleCount: number;
} {
  const now = performance.now();
  const duration = now - state.startTime;

  // Filter out samples affected by major stalls (e.g., bug report button press)
  const filteredSamples = filterSamplesExcludingStalls(state.samples);

  // Use filtered samples for analysis (excludes stall artifacts)
  const fps = filteredSamples.map((s) => s.fps);
  const alpha = filteredSamples.map((s) => s.alpha);
  const physicsHz = filteredSamples.map((s) => s.physicsHz);

  return {
    version: 6,
    captureStart: new Date(Date.now() - duration).toISOString(),
    duration: Math.round(duration),
    sampleCount: state.samples.length,
    filteredSampleCount: filteredSamples.length,
    summary: {
      fps: calcStats(fps),
      alpha: calcStats(alpha),
      physicsHz: calcStats(physicsHz),
    },
    // Use filtered samples for analysis (excludes stall artifacts)
    alphaDistribution: analyzeAlphaDistribution(filteredSamples),
    alphaChoppiness: analyzeAlphaChoppiness(filteredSamples),
    frameTiming: analyzeFrameTiming(filteredSamples),
    // Include all samples in export for full visibility
    samples: state.samples,
  };
}

/**
 * Clear all telemetry data.
 */
export function clearTelemetry(): void {
  state.samples = [];
  state.startTime = performance.now();
}

/**
 * Enable or disable telemetry capture.
 *
 * @param enabled - Whether to capture telemetry
 */
export function setTelemetryEnabled(enabled: boolean): void {
  state.enabled = enabled;
}

/**
 * Get telemetry as downloadable JSON string.
 *
 * @returns JSON string of telemetry data
 */
export function getTelemetryJson(): string {
  return JSON.stringify(getTelemetryExport(), null, 2);
}
