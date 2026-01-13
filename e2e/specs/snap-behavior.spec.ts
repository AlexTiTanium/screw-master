/**
 * Position mismatch verification test.
 *
 * Position mismatches should NOT occur during normal gameplay with the buffer system.
 * If a POSITION_MISMATCH warning appears, it indicates a bug in animation targeting
 * where a screw ended up at a different position than expected.
 *
 * This test plays through a level that exercises buffer → tray transfers
 * and asserts that no position mismatches occurred.
 */

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

test.describe('Position Mismatch Detection', () => {
  test('no POSITION_MISMATCH warnings during buffer-to-tray transfers', async ({
    page,
  }) => {
    // Collect POSITION_MISMATCH warnings - these indicate a bug
    const positionMismatches: string[] = [];
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('POSITION_MISMATCH')) {
        console.log(`[POSITION MISMATCH] ${text}`);
        positionMismatches.push(text);
      }
    });

    attachTelemetry(page);
    await page.goto('/?testMode=1&region=test&level=0');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);
    await page.waitForTimeout(500);

    // Action sequence that triggers buffer → tray transfers
    // This exercises the position verification code path:
    // 1. Add screws to buffer (green, yellow trays not visible)
    // 2. Fill a visible tray to trigger hide/shift/reveal
    // 3. Buffer screws auto-transfer to newly revealed tray
    const actions = [
      { x: 400, y: 1369, delay: 800, comment: 'green → buffer' },
      { x: 680, y: 1304, delay: 800, comment: 'yellow → buffer' },
      { x: 315, y: 1289, delay: 800, comment: 'red → red tray [0]' },
      { x: 595, y: 1434, delay: 800, comment: 'red → red tray [1]' },
      {
        x: 400,
        y: 1169,
        delay: 2000,
        comment:
          'red → red tray [2] - fills red, reveals green, triggers transfer',
      },
    ];

    for (const action of actions) {
      await harness.act({ type: 'pointerDown', x: action.x, y: action.y });
      await harness.act({ type: 'pointerUp', x: action.x, y: action.y });
      await page.waitForTimeout(action.delay);
    }

    // Wait for all transfers to complete
    await page.waitForTimeout(2000);

    // Assert NO POSITION_MISMATCH warnings occurred
    expect(
      positionMismatches,
      `POSITION_MISMATCH warnings detected - this indicates a position mismatch bug:\n${positionMismatches.join('\n')}`
    ).toHaveLength(0);
  });

  test('no POSITION_MISMATCH warnings during rapid clicking', async ({
    page,
  }) => {
    // Test with fast input to stress-test animation timing
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

    // Same actions but with faster delays (50ms between taps)
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

    // Wait for all animations and transfers to complete
    await page.waitForTimeout(5000);

    // Assert NO POSITION_MISMATCH warnings occurred
    expect(
      positionMismatches,
      `POSITION_MISMATCH warnings during rapid clicking:\n${positionMismatches.join('\n')}`
    ).toHaveLength(0);
  });

  test('reproduce bug report 2026-01-12T22-27-20 - blue screw snap during tray animation', async ({
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

    // Exact action sequence from bug report - fills red tray, then blue tray
    const actions = [
      { x: 400, y: 1369, delay: 600 },
      { x: 315, y: 1289, delay: 600 },
      { x: 485, y: 1289, delay: 600 },
      { x: 400, y: 1169, delay: 600 },
      { x: 360, y: 949, delay: 600 },
      { x: 660, y: 949, delay: 600 },
      { x: 680, y: 1304, delay: 600 },
      { x: 595, y: 1434, delay: 600 },
      { x: 765, y: 1434, delay: 2000 },
    ];

    for (const action of actions) {
      await harness.act({ type: 'pointerDown', x: action.x, y: action.y });
      await harness.act({ type: 'pointerUp', x: action.x, y: action.y });
      await page.waitForTimeout(action.delay);
    }

    await page.waitForTimeout(3000);

    // Verify screws are at correct positions
    const screws = await harness.queryByComponent('screw');
    const trays = await harness.queryByComponent('tray');

    const screwsInTray = screws.filter((s) => {
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
        const trayColor = tc.tray?.color;

        expect(
          screwColor,
          `${String(screwColor)} screw ended up in ${String(trayColor)} tray - position bug!`
        ).toBe(trayColor);
      }
    }

    expect(
      positionMismatches,
      `Position mismatches detected during bug reproduction:\n${positionMismatches.join('\n')}`
    ).toHaveLength(0);
  });

  test('reproduce bug report 2026-01-12T22-40-50 - green screw position mismatch', async ({
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
    await page.waitForTimeout(300);

    // Exact action sequence from bug report - fills blue tray twice
    const actions = [
      { x: 765, y: 1434, delay: 200 },
      { x: 680, y: 1304, delay: 200 },
      { x: 595, y: 1434, delay: 200 },
      { x: 485, y: 1289, delay: 200 },
      { x: 400, y: 1369, delay: 200 },
      { x: 315, y: 1289, delay: 200 },
      { x: 400, y: 1169, delay: 200 },
      { x: 360, y: 949, delay: 200 },
      { x: 660, y: 949, delay: 500 },
    ];

    for (const action of actions) {
      await harness.act({ type: 'pointerDown', x: action.x, y: action.y });
      await harness.act({ type: 'pointerUp', x: action.x, y: action.y });
      await page.waitForTimeout(action.delay);
    }

    await page.waitForTimeout(2500);

    // Verify screws are at correct positions
    const screws = await harness.queryByComponent('screw');
    const trays = await harness.queryByComponent('tray');

    const screwsInTray = screws.filter((s) => {
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
        const trayColor = tc.tray?.color;

        expect(
          screwColor,
          `${String(screwColor)} screw ended up in ${String(trayColor)} tray - position bug!`
        ).toBe(trayColor);
      }
    }

    expect(
      positionMismatches,
      `Position mismatches detected:\n${positionMismatches.join('\n')}`
    ).toHaveLength(0);
  });

  test('reproduce bug report 2026-01-12T23-02-16 - green screw at wrong x position', async ({
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

    // Action sequence from bug report - optimized delays
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

    // Wait for all animations and auto-transfers to complete
    await page.waitForTimeout(2000);

    // Verify screws are at correct positions
    const screws = await harness.queryByComponent('screw');
    const trays = await harness.queryByComponent('tray');

    const screwsInTray = screws.filter((s) => {
      const sc = s.components as { screw?: { state?: string } };
      return sc.screw?.state === 'inTray';
    });

    for (const s of screwsInTray) {
      const sc = s.components as { screw?: { color?: string } };
      const screwColor = sc.screw?.color;

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
        const trayColor = tc.tray?.color;

        // Fail if screw is in wrong tray
        expect(
          screwColor,
          `${String(screwColor)} screw ended up in ${String(trayColor)} tray - position bug!`
        ).toBe(trayColor);
      }
    }

    // Assert NO position mismatches detected
    expect(
      positionMismatches,
      `Position mismatches detected:\n${positionMismatches.join('\n')}`
    ).toHaveLength(0);
  });
});
