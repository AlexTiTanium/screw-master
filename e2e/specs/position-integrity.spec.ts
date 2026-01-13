/**
 * Consolidated E2E tests for position integrity and misplacement detection.
 *
 * Tests that screws end up at correct positions during gameplay,
 * especially during buffer→tray transfers and rapid input scenarios.
 */

import { test, expect } from '@playwright/test';
import { attachTelemetry } from '../helpers/telemetry';
import { createHarnessClient } from '../helpers/harness';

// Video recording controlled by RECORD_VIDEO env var
const recordVideo = process.env.RECORD_VIDEO === '1';
test.use({
  video: recordVideo
    ? { mode: 'on', size: { width: 540, height: 960 } }
    : 'off',
  viewport: { width: 540, height: 960 },
});

/**
 * Verify that all screws in trays are in the correct colored tray.
 * Returns any misplaced screws found.
 */
async function verifyScrewsInCorrectTrays(
  harness: ReturnType<typeof createHarnessClient>
): Promise<{ color: string; trayColor: string }[]> {
  const screws = await harness.queryByComponent('screw');
  const trays = await harness.queryByComponent('tray');
  const misplaced: { color: string; trayColor: string }[] = [];

  const screwsInTray = screws.filter((s) => {
    const sc = s.components as { screw?: { state?: string } };
    return sc.screw?.state === 'inTray';
  });

  for (const s of screwsInTray) {
    const sc = s.components as { screw?: { color?: string } };
    const screwColor = sc.screw?.color ?? 'unknown';

    // Find nearest colored tray
    let nearestTray = null;
    let nearestDistance = Infinity;

    for (const tray of trays) {
      const tc = tray.components as {
        tray?: { color?: string; isBuffer?: boolean };
      };
      if (tc.tray?.isBuffer) continue;

      const distance = Math.abs(s.position.x - tray.position.x);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestTray = tray;
      }
    }

    if (nearestTray && nearestDistance < 97) {
      const tc = nearestTray.components as { tray?: { color?: string } };
      const trayColor = tc.tray?.color ?? 'unknown';

      if (screwColor !== trayColor) {
        misplaced.push({ color: screwColor, trayColor });
      }
    }
  }

  return misplaced;
}

test.describe('Position Integrity', () => {
  test('no POSITION_MISMATCH warnings during buffer-to-tray transfers', async ({
    page,
  }) => {
    const positionMismatches: string[] = [];
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('POSITION_MISMATCH')) {
        positionMismatches.push(text);
      }
    });

    attachTelemetry(page);
    await page.goto('/?testMode=1&region=test&level=0');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);
    await page.waitForTimeout(500);

    // Action sequence that triggers buffer → tray transfers:
    // 1. Add screws to buffer (green, yellow trays not visible)
    // 2. Fill a visible tray to trigger hide/shift/reveal
    // 3. Buffer screws auto-transfer to newly revealed tray
    const actions = [
      { x: 400, y: 1369, delay: 800 }, // green → buffer
      { x: 680, y: 1304, delay: 800 }, // yellow → buffer
      { x: 315, y: 1289, delay: 800 }, // red → red tray
      { x: 595, y: 1434, delay: 800 }, // red → red tray
      { x: 400, y: 1169, delay: 2000 }, // red → fills red, reveals green
    ];

    for (const action of actions) {
      await harness.act({ type: 'pointerDown', x: action.x, y: action.y });
      await harness.act({ type: 'pointerUp', x: action.x, y: action.y });
      await page.waitForTimeout(action.delay);
    }

    // Wait for all transfers to complete
    await page.waitForTimeout(2000);

    // Verify no position mismatches
    expect(
      positionMismatches,
      `POSITION_MISMATCH warnings detected:\n${positionMismatches.join('\n')}`
    ).toHaveLength(0);

    // Verify screws are in correct trays
    const misplaced = await verifyScrewsInCorrectTrays(harness);
    expect(
      misplaced,
      `Misplaced screws: ${misplaced.map((m) => `${m.color} in ${m.trayColor}`).join(', ')}`
    ).toHaveLength(0);
  });

  test('no position mismatches during rapid clicking', async ({ page }) => {
    const positionMismatches: string[] = [];
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('POSITION_MISMATCH')) {
        positionMismatches.push(text);
      }
    });

    attachTelemetry(page);
    await page.goto('/?testMode=1&region=test&level=0');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);
    await page.waitForTimeout(500);

    // Same actions but with fast delays (50ms between taps)
    // This creates overlapping animations and tests timing edge cases
    const actions = [
      { x: 400, y: 1369 },
      { x: 680, y: 1304 },
      { x: 315, y: 1289 },
      { x: 595, y: 1434 },
      { x: 400, y: 1169 },
    ];

    for (const action of actions) {
      await harness.act({ type: 'pointerDown', x: action.x, y: action.y });
      await harness.act({ type: 'pointerUp', x: action.x, y: action.y });
      await page.waitForTimeout(50); // Fast clicks
    }

    // Wait for all animations to complete
    await page.waitForTimeout(5000);

    expect(
      positionMismatches,
      `POSITION_MISMATCH during rapid clicking:\n${positionMismatches.join('\n')}`
    ).toHaveLength(0);

    const misplaced = await verifyScrewsInCorrectTrays(harness);
    expect(
      misplaced,
      `Misplaced screws: ${misplaced.map((m) => `${m.color} in ${m.trayColor}`).join(', ')}`
    ).toHaveLength(0);
  });

  test('regression: green screw position during tray transition (bug 2026-01-12)', async ({
    page,
  }) => {
    // Reproduces exact sequence from bug report 2026-01-12T23-02-16-550Z
    // Bug: green screw at (344.5, 278) expected (149.5, 278) delta=195px
    const positionMismatches: string[] = [];
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('POSITION_MISMATCH')) {
        positionMismatches.push(text);
      }
    });

    attachTelemetry(page);
    await page.goto('/?testMode=1&region=test&level=0');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);

    // Action sequence from bug report
    const actions = [
      { x: 400, y: 1369, delay: 350 }, // green → buffer [0]
      { x: 485, y: 1289, delay: 400 }, // blue → blue [0]
      { x: 680, y: 1304, delay: 400 }, // yellow → buffer [1]
      { x: 765, y: 1434, delay: 400 }, // blue → blue [1]
      { x: 595, y: 1434, delay: 400 }, // red → red [0]
      { x: 315, y: 1289, delay: 400 }, // red → red [1]
      { x: 400, y: 1169, delay: 500 }, // red → red [2] - FILLS RED
      { x: 360, y: 949, delay: 175 }, // blue → buffer [2] - triggers transition
      { x: 660, y: 949, delay: 1500 }, // green → buffer [3]
    ];

    for (const action of actions) {
      await harness.act({ type: 'pointerDown', x: action.x, y: action.y });
      await harness.act({ type: 'pointerUp', x: action.x, y: action.y });
      await page.waitForTimeout(action.delay);
    }

    // Wait for all animations and auto-transfers
    await page.waitForTimeout(2000);

    // Verify screws are in correct trays
    const misplaced = await verifyScrewsInCorrectTrays(harness);
    for (const m of misplaced) {
      expect
        .soft(
          m.color,
          `${m.color} screw ended up in ${m.trayColor} tray - position bug!`
        )
        .toBe(m.trayColor);
    }

    expect(
      positionMismatches,
      `Position mismatches detected:\n${positionMismatches.join('\n')}`
    ).toHaveLength(0);
  });
});
