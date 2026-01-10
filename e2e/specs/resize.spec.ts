import { test, expect } from '@playwright/test';
import { attachTelemetry, printTelemetry } from '../helpers/telemetry';
import { createHarnessClient } from '../helpers/harness';
import type { Page } from '@playwright/test';

interface CanvasInfo {
  // Canvas element dimensions (CSS pixels)
  clientWidth: number;
  clientHeight: number;
  // Canvas position relative to viewport
  left: number;
  top: number;
  // Viewport dimensions
  viewportWidth: number;
  viewportHeight: number;
  // Canvas internal resolution
  width: number;
  height: number;
}

async function getCanvasInfo(page: Page): Promise<CanvasInfo> {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) throw new Error('Canvas not found');
    const rect = canvas.getBoundingClientRect();
    return {
      clientWidth: rect.width,
      clientHeight: rect.height,
      left: rect.left,
      top: rect.top,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      width: canvas.width,
      height: canvas.height,
    };
  });
}

function logCanvasInfo(info: CanvasInfo, label: string): void {
  console.log(`\n${label}:`);
  console.log(
    `  Viewport: ${String(info.viewportWidth)}x${String(info.viewportHeight)}`
  );
  console.log(
    `  Canvas CSS size: ${String(info.clientWidth)}x${String(info.clientHeight)}`
  );
  console.log(
    `  Canvas internal: ${String(info.width)}x${String(info.height)}`
  );
  console.log(`  Position: left=${String(info.left)}, top=${String(info.top)}`);
  console.log(
    `  Aspect ratio: ${(info.clientWidth / info.clientHeight).toFixed(3)}`
  );
}

test.describe('Resize and centering', () => {
  test('centers canvas horizontally in wide viewport', async ({ page }) => {
    const telemetry = attachTelemetry(page);

    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/?testMode=1');

    const harness = createHarnessClient(page);
    await harness.waitForReady();

    const info = await getCanvasInfo(page);
    logCanvasInfo(info, 'Wide landscape (1920x1080)');

    // Canvas should fill height
    expect(info.clientHeight).toBeCloseTo(1080, -1);

    // Canvas width should maintain 9:16 aspect ratio
    const expectedWidth = 1080 * (9 / 16);
    expect(info.clientWidth).toBeCloseTo(expectedWidth, -1);

    // Canvas should be horizontally centered
    const expectedLeft = (1920 - info.clientWidth) / 2;
    expect(info.left).toBeCloseTo(expectedLeft, 0);

    printTelemetry(telemetry);
  });

  test('fills viewport in portrait mode', async ({ page }) => {
    const telemetry = attachTelemetry(page);

    await page.setViewportSize({ width: 540, height: 960 });
    await page.goto('/?testMode=1');

    const harness = createHarnessClient(page);
    await harness.waitForReady();

    const info = await getCanvasInfo(page);
    logCanvasInfo(info, 'Portrait (540x960)');

    // Should fill entire viewport (same aspect ratio as game)
    expect(info.clientWidth).toBeCloseTo(540, -1);
    expect(info.clientHeight).toBeCloseTo(960, -1);
    expect(info.left).toBeCloseTo(0, 0);

    printTelemetry(telemetry);
  });

  test('centers in square viewport', async ({ page }) => {
    const telemetry = attachTelemetry(page);

    await page.setViewportSize({ width: 800, height: 800 });
    await page.goto('/?testMode=1');

    const harness = createHarnessClient(page);
    await harness.waitForReady();

    const info = await getCanvasInfo(page);
    logCanvasInfo(info, 'Square (800x800)');

    // Height should fill viewport
    expect(info.clientHeight).toBeCloseTo(800, -1);

    // Width maintains aspect ratio (9:16)
    const expectedWidth = 800 * (9 / 16);
    expect(info.clientWidth).toBeCloseTo(expectedWidth, -1);

    // Centered horizontally
    const expectedLeft = (800 - info.clientWidth) / 2;
    expect(info.left).toBeCloseTo(expectedLeft, 0);

    printTelemetry(telemetry);
  });

  test('handles viewport resize dynamically', async ({ page }) => {
    const telemetry = attachTelemetry(page);

    await page.setViewportSize({ width: 540, height: 960 });
    await page.goto('/?testMode=1');

    const harness = createHarnessClient(page);
    await harness.waitForReady();

    // Initial: portrait
    let info = await getCanvasInfo(page);
    logCanvasInfo(info, 'Initial portrait (540x960)');
    expect(info.left).toBeCloseTo(0, 0);

    // Resize to wide landscape
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(100); // Wait for resize handler

    info = await getCanvasInfo(page);
    logCanvasInfo(info, 'After resize to landscape (1920x1080)');

    // Should now be centered with letterboxing
    expect(info.left).toBeGreaterThan(100);
    expect(info.clientHeight).toBeCloseTo(1080, -1);

    printTelemetry(telemetry);
  });

  test('ultra-wide viewport has large letterboxing', async ({ page }) => {
    const telemetry = attachTelemetry(page);

    await page.setViewportSize({ width: 2560, height: 1080 });
    await page.goto('/?testMode=1');

    const harness = createHarnessClient(page);
    await harness.waitForReady();

    const info = await getCanvasInfo(page);
    logCanvasInfo(info, 'Ultra-wide (2560x1080)');

    // Canvas should fill height
    expect(info.clientHeight).toBeCloseTo(1080, -1);

    // Canvas width maintains 9:16 aspect ratio
    const expectedWidth = 1080 * (9 / 16);
    expect(info.clientWidth).toBeCloseTo(expectedWidth, -1);

    // Large letterboxing on both sides
    const expectedLeft = (2560 - info.clientWidth) / 2;
    expect(info.left).toBeCloseTo(expectedLeft, 0);
    expect(info.left).toBeGreaterThan(900); // Significant letterboxing

    printTelemetry(telemetry);
  });
});
