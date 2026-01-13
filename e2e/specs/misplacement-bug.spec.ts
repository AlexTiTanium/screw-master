/**
 * Misplacement bug reproduction test.
 * Generated from user action log to reproduce potential placement bugs.
 */
/* eslint-disable @typescript-eslint/restrict-template-expressions */

import { test, expect } from '@playwright/test';
import { attachTelemetry } from '../helpers/telemetry';
import { createHarnessClient } from '../helpers/harness';

// Video recording controlled by RECORD_VIDEO env var (see playwright.config.ts)
const recordVideo = process.env.RECORD_VIDEO === '1';
test.use({
  video: recordVideo
    ? { mode: 'on', size: { width: 540, height: 960 } }
    : 'off',
  viewport: { width: 540, height: 960 },
});

test.describe('Misplacement Bug', () => {
  test('reproduce bug from user action log v2', async ({ page }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1&region=test&level=0');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);

    // Action sequence - optimized delays (400ms per tap, animations ~450ms)
    const screwSequence = [
      { x: 595, y: 1434, delay: 400 }, // red → red tray [0]
      { x: 765, y: 1434, delay: 400 }, // blue → blue tray [0]
      { x: 680, y: 1304, delay: 400 }, // yellow → buffer [0]
      { x: 485, y: 1289, delay: 400 }, // blue → blue tray [1]
      { x: 400, y: 1369, delay: 400 }, // green → buffer [1]
      { x: 315, y: 1289, delay: 400 }, // red → red tray [1]
      { x: 400, y: 1169, delay: 150 }, // red → red tray [2] - FILLS, rapid click
      { x: 660, y: 949, delay: 800 }, // green → during transition
    ];

    for (const action of screwSequence) {
      await harness.act({ type: 'pointerDown', x: action.x, y: action.y });
      await harness.act({ type: 'pointerUp', x: action.x, y: action.y });
      await page.waitForTimeout(action.delay);
    }

    // Wait for animations to complete
    await page.waitForTimeout(1000);

    // Verify no misplacement
    const finalScrews = await harness.queryByComponent('screw');
    const trays = await harness.queryByComponent('tray');

    const screwsInTray = finalScrews.filter((s) => {
      const sc = s.components as { screw?: { state?: string } };
      return sc.screw?.state === 'inTray';
    });

    for (const s of screwsInTray) {
      const sc = s.components as { screw?: { color?: string } };
      const screwColor = sc.screw?.color;

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
        expect(screwColor, `Misplaced screw`).toBe(tc.tray?.color);
      }
    }
  });

  test('reproduce bug from user action log v3 - different tap order', async ({
    page,
  }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1&region=test&level=0');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);

    // Action sequence - optimized delays
    const screwSequence = [
      { x: 765, y: 1434, delay: 400 }, // blue → blue tray [0]
      { x: 680, y: 1304, delay: 400 }, // yellow → buffer [0]
      { x: 400, y: 1369, delay: 400 }, // green → buffer [1]
      { x: 595, y: 1434, delay: 400 }, // red → red tray [0]
      { x: 485, y: 1289, delay: 400 }, // blue → blue tray [1]
      { x: 315, y: 1289, delay: 400 }, // red → red tray [1]
      { x: 400, y: 1169, delay: 150 }, // red → red tray [2] - FILLS
      { x: 360, y: 949, delay: 150 }, // blue → during transition
      { x: 660, y: 949, delay: 800 }, // green → after transitions
    ];

    for (const action of screwSequence) {
      await harness.act({ type: 'pointerDown', x: action.x, y: action.y });
      await harness.act({ type: 'pointerUp', x: action.x, y: action.y });
      await page.waitForTimeout(action.delay);
    }

    // Wait for animations to complete
    await page.waitForTimeout(1000);

    // Verify no misplacement
    const finalScrews = await harness.queryByComponent('screw');
    const trays = await harness.queryByComponent('tray');

    const screwsInTray = finalScrews.filter((s) => {
      const sc = s.components as { screw?: { state?: string } };
      return sc.screw?.state === 'inTray';
    });

    for (const s of screwsInTray) {
      const sc = s.components as { screw?: { color?: string } };
      const screwColor = sc.screw?.color;

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
        expect(screwColor, `Misplaced screw`).toBe(tc.tray?.color);
      }
    }
  });

  test('red tray should hide after being filled via buffer transfer', async ({
    page,
  }) => {
    // This reproduces a bug where the red tray fills via a buffer transfer
    // but the hide animation is never triggered
    attachTelemetry(page);
    await page.goto('/?testMode=1&region=test&level=0');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);

    // Action sequence - FAST clicks to create overlapping animations
    const actionSequence = [
      { x: 485, y: 1289, delay: 50 }, // blue → blue [0]
      { x: 400, y: 1369, delay: 50 }, // green → buffer [0]
      { x: 315, y: 1289, delay: 50 }, // red → red [0]
      { x: 680, y: 1304, delay: 50 }, // yellow → buffer [1]
      { x: 595, y: 1434, delay: 50 }, // red → red [1]
      { x: 765, y: 1434, delay: 50 }, // blue → blue [1]
      { x: 660, y: 949, delay: 50 }, // green → buffer [2]
      { x: 360, y: 949, delay: 50 }, // blue → blue [2] - FILLS BLUE
      { x: 400, y: 1169, delay: 50 }, // red → buffer (during transition)
    ];

    for (const action of actionSequence) {
      await harness.act({ type: 'pointerDown', x: action.x, y: action.y });
      await harness.act({ type: 'pointerUp', x: action.x, y: action.y });
      await page.waitForTimeout(action.delay);
    }

    // Wait for all animations and transfers to complete
    await page.waitForTimeout(2000);

    // Check final state
    const trays = await harness.queryByComponent('tray');

    let redTrayVisible = false;
    let redTrayScrewCount = 0;

    for (const t of trays) {
      const tc = t.components as {
        tray?: {
          color?: string;
          screwCount?: number;
          capacity?: number;
          displayOrder?: number;
        };
      };
      const visible = (tc.tray?.displayOrder ?? 99) < 2;

      if (tc.tray?.color === 'red') {
        redTrayVisible = visible;
        redTrayScrewCount = tc.tray?.screwCount ?? 0;
      }
    }

    // Red tray should NOT be visible if it's full (3 screws)
    if (redTrayScrewCount >= 3) {
      expect(
        redTrayVisible,
        `Red tray is full (${redTrayScrewCount} screws) but still visible - hide animation didn't trigger!`
      ).toBe(false);
    }
  });

  test('slow vs fast input speed should produce identical final state', async ({
    page,
  }) => {
    attachTelemetry(page);

    // The action sequence to test - coordinates from user's log
    const actionSequence = [
      { x: 765, y: 1434 }, // blue → blue tray
      { x: 595, y: 1434 }, // red → red tray
      { x: 680, y: 1304 }, // yellow → buffer
      { x: 485, y: 1289 }, // blue → blue tray
      { x: 400, y: 1369 }, // green → buffer
      { x: 315, y: 1289 }, // red → red tray
      { x: 400, y: 1169 }, // red → red tray (fills, triggers hide)
      { x: 360, y: 949 }, // blue → during transition
      { x: 660, y: 949 }, // green → after transition
    ];

    /**
     * Execute the action sequence with specified delay between taps.
     * Returns the final state of screws in trays for comparison.
     */
    async function executeSequenceAndCaptureFinalState(
      delayMs: number
    ): Promise<{
      screwsInTrays: { color: string; trayColor: string; x: number }[];
      trayStates: {
        color: string;
        screwCount: number;
        displayOrder: number;
      }[];
    }> {
      // Reload page to reset state
      await page.goto('/?testMode=1&region=test&level=0');
      const harness = createHarnessClient(page);
      await harness.waitForReady(15000);

      // Execute all actions
      for (const action of actionSequence) {
        await harness.act({ type: 'pointerDown', x: action.x, y: action.y });
        await harness.act({ type: 'pointerUp', x: action.x, y: action.y });
        await page.waitForTimeout(delayMs);
      }

      // Wait for all animations and auto-transfers to complete
      // FAST mode causes more queued transitions, so need extra time
      await page.waitForTimeout(5000);

      // Capture final state
      const finalScrews = await harness.queryByComponent('screw');
      const trays = await harness.queryByComponent('tray');

      // Build screw state - only screws in trays (not board, not buffer)
      const screwsInTrays: {
        color: string;
        trayColor: string;
        x: number;
      }[] = [];

      for (const s of finalScrews) {
        const sc = s.components as {
          screw?: { state?: string; color?: string };
        };
        if (sc.screw?.state !== 'inTray') continue;

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
          screwsInTrays.push({
            color: sc.screw?.color ?? 'unknown',
            trayColor: tc.tray?.color ?? 'unknown',
            x: Math.round(s.position.x),
          });
        }
      }

      // Sort by x position for consistent comparison
      screwsInTrays.sort((a, b) => a.x - b.x);

      // Build tray state
      const trayStates: {
        color: string;
        screwCount: number;
        displayOrder: number;
      }[] = [];

      for (const t of trays) {
        const tc = t.components as {
          tray?: {
            color?: string;
            screwCount?: number;
            displayOrder?: number;
            isBuffer?: boolean;
          };
        };
        if (tc.tray?.isBuffer) continue;

        trayStates.push({
          color: tc.tray?.color ?? 'unknown',
          screwCount: tc.tray?.screwCount ?? 0,
          displayOrder: tc.tray?.displayOrder ?? 99,
        });
      }

      // Sort by displayOrder for consistent comparison
      trayStates.sort((a, b) => a.displayOrder - b.displayOrder);

      return { screwsInTrays, trayStates };
    }

    // Execute with SLOW speed (800ms between taps - after animations complete)
    const slowResult = await executeSequenceAndCaptureFinalState(800);

    // Execute with FAST speed (50ms between taps - rapid clicking)
    const fastResult = await executeSequenceAndCaptureFinalState(50);

    // Check that all screws in trays match their tray color (no misplacement)
    for (const screw of slowResult.screwsInTrays) {
      expect(screw.color, `SLOW: screw in wrong tray`).toBe(screw.trayColor);
    }

    for (const screw of fastResult.screwsInTrays) {
      expect(
        screw.color,
        `FAST: ${screw.color} screw in ${screw.trayColor} tray - MISPLACEMENT!`
      ).toBe(screw.trayColor);
    }

    // Compare the number of screws in each tray type
    const slowByScrewColor = new Map<string, number>();
    const fastByScrewColor = new Map<string, number>();

    for (const s of slowResult.screwsInTrays) {
      slowByScrewColor.set(s.color, (slowByScrewColor.get(s.color) ?? 0) + 1);
    }
    for (const s of fastResult.screwsInTrays) {
      fastByScrewColor.set(s.color, (fastByScrewColor.get(s.color) ?? 0) + 1);
    }

    // The counts should match (same number of each color screw ended up in trays)
    for (const [color, slowCount] of slowByScrewColor) {
      const fastCount = fastByScrewColor.get(color) ?? 0;
      expect(
        fastCount,
        `${color} screw count mismatch: slow=${slowCount}, fast=${fastCount}`
      ).toBe(slowCount);
    }

    // Compare tray states
    expect(fastResult.trayStates.length).toBe(slowResult.trayStates.length);

    for (let i = 0; i < slowResult.trayStates.length; i++) {
      const slowTray = slowResult.trayStates[i];
      const fastTray = fastResult.trayStates[i];
      if (!slowTray || !fastTray) continue;

      expect(
        fastTray.screwCount,
        `${slowTray.color} tray screwCount mismatch`
      ).toBe(slowTray.screwCount);
    }
  });
});
