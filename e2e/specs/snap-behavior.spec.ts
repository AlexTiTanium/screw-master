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
  video: recordVideo ? { mode: 'on', size: { width: 540, height: 960 } } : 'off',
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
      console.log(
        `Tap (${String(action.x)}, ${String(action.y)}) - ${action.comment}`
      );
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
        console.log(`[POSITION MISMATCH] ${text}`);
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
      { x: 400, y: 1369, comment: 'green → buffer' },
      { x: 680, y: 1304, comment: 'yellow → buffer' },
      { x: 315, y: 1289, comment: 'red → red tray [0]' },
      { x: 595, y: 1434, comment: 'red → red tray [1]' },
      { x: 400, y: 1169, comment: 'red → red tray [2] - triggers transitions' },
    ];

    for (const action of actions) {
      console.log(
        `Fast tap (${String(action.x)}, ${String(action.y)}) - ${action.comment}`
      );
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
    // This test reproduces the exact sequence from the bug report where:
    // - Blue screw was at (384.5, 278) in blue tray at displayOrder 1
    // - Blue tray started shifting to displayOrder 0
    // - SNAP_CORRECTION moved blue screw to (189.5, 278) instantly
    // - This caused visual glitch (screw jumped before tray moved)

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

    // Exact action sequence from bug report console-log.txt
    // This sequence fills red tray, then blue tray, causing multiple tray shifts
    const actions = [
      { x: 400, y: 1369, delay: 600, comment: 'green → buffer [0]' },
      { x: 315, y: 1289, delay: 600, comment: 'red → red [0]' },
      { x: 485, y: 1289, delay: 600, comment: 'blue → blue [0]' },
      { x: 400, y: 1169, delay: 600, comment: 'red → red [1]' },
      { x: 360, y: 949, delay: 600, comment: 'blue → blue [1]' },
      { x: 660, y: 949, delay: 600, comment: 'green → buffer [1]' },
      { x: 680, y: 1304, delay: 600, comment: 'yellow → buffer [2]' },
      { x: 595, y: 1434, delay: 600, comment: 'red → red [2] - FILLS RED' },
      { x: 765, y: 1434, delay: 2000, comment: 'blue → blue [2] - FILLS BLUE' },
    ];

    for (const action of actions) {
      console.log(
        `Tap (${String(action.x)}, ${String(action.y)}) - ${action.comment}`
      );
      await harness.act({ type: 'pointerDown', x: action.x, y: action.y });
      await harness.act({ type: 'pointerUp', x: action.x, y: action.y });
      await page.waitForTimeout(action.delay);
    }

    // Wait for all animations and auto-transfers to complete
    await page.waitForTimeout(3000);

    // Verify screws are at correct positions
    const screws = await harness.queryByComponent('screw');
    const trays = await harness.queryByComponent('tray');

    // Check each screw in a tray is in the correct colored tray
    const screwsInTray = screws.filter((s) => {
      const sc = s.components as { screw?: { state?: string } };
      return sc.screw?.state === 'inTray';
    });

    console.log('\n=== FINAL SCREW POSITIONS ===');
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
        const match = screwColor === trayColor ? '✓' : '✗ WRONG POSITION!';
        console.log(
          `${String(screwColor)} screw at x=${String(s.position.x)} → ${String(trayColor)} tray ${match}`
        );

        // Fail if screw is in wrong tray
        expect(
          screwColor,
          `${String(screwColor)} screw ended up in ${String(trayColor)} tray - position bug!`
        ).toBe(trayColor);
      }
    }

    // Assert NO position mismatches detected by our diagnostic
    expect(
      positionMismatches,
      `Position mismatches detected during bug reproduction:\n${positionMismatches.join('\n')}`
    ).toHaveLength(0);
  });

  test('reproduce bug report 2026-01-12T22-40-50 - green screw position mismatch', async ({
    page,
  }) => {
    // This test reproduces the exact sequence from bug report 2026-01-12T22-40-50-601Z
    // where green screw ended up at (344.5, 278) but expected (149.5, 278)
    // delta=195px exactly one tray slot width
    // Root cause: transfer started when tray.displayOrder was 1, but by
    // animation completion the tray had shifted to displayOrder 0

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
    await page.waitForTimeout(300);

    // Exact action sequence from bug report console-log.txt
    // This fills blue tray twice, causing multiple tray shift cycles
    const actions = [
      { x: 765, y: 1434, delay: 200, comment: 'blue → blue [0]' },
      { x: 680, y: 1304, delay: 200, comment: 'yellow → buffer [0]' },
      { x: 595, y: 1434, delay: 200, comment: 'red → red [0]' },
      { x: 485, y: 1289, delay: 200, comment: 'blue → blue [1]' },
      { x: 400, y: 1369, delay: 200, comment: 'green → buffer [1]' },
      { x: 315, y: 1289, delay: 200, comment: 'red → red [1]' },
      { x: 400, y: 1169, delay: 200, comment: 'red → red [2] - FILLS RED' },
      { x: 360, y: 949, delay: 200, comment: 'blue → buffer [2]' },
      { x: 660, y: 949, delay: 500, comment: 'green → buffer [3]' },
    ];

    for (const action of actions) {
      console.log(
        `Tap (${String(action.x)}, ${String(action.y)}) - ${action.comment}`
      );
      await harness.act({ type: 'pointerDown', x: action.x, y: action.y });
      await harness.act({ type: 'pointerUp', x: action.x, y: action.y });
      await page.waitForTimeout(action.delay);
    }

    // Wait for all animations and auto-transfers to complete
    await page.waitForTimeout(2500);

    // Verify screws are at correct positions
    const screws = await harness.queryByComponent('screw');
    const trays = await harness.queryByComponent('tray');

    // Check each screw in a tray is in the correct colored tray
    const screwsInTray = screws.filter((s) => {
      const sc = s.components as { screw?: { state?: string } };
      return sc.screw?.state === 'inTray';
    });

    console.log('\n=== FINAL SCREW POSITIONS ===');
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
        const match = screwColor === trayColor ? '✓' : '✗ WRONG POSITION!';
        console.log(
          `${String(screwColor)} screw at x=${String(s.position.x)} → ${String(trayColor)} tray ${match}`
        );

        // Fail if screw is in wrong tray
        expect(
          screwColor,
          `${String(screwColor)} screw ended up in ${String(trayColor)} tray - position bug!`
        ).toBe(trayColor);
      }
    }

    // Assert NO position mismatches detected by our diagnostic
    expect(
      positionMismatches,
      `Position mismatches detected:\n${positionMismatches.join('\n')}`
    ).toHaveLength(0);
  });

  test('reproduce bug report 2026-01-12T23-02-16 - green screw at wrong x position', async ({
    page,
  }) => {
    // This test reproduces the exact sequence from bug report 2026-01-12T23-02-16-550Z
    // Bug: green screw at (344.5, 278) expected (149.5, 278) delta=195px
    // Final state shows green screw (entity 22) at x=344.5 in green tray slot 1
    // but x=344.5 is visually in the yellow tray area!
    //
    // Timeline analysis from console-log.txt (absolute times from app start):
    // T117 (3211ms): TAP green → buffer [0]
    // T140 (3606ms): TAP blue → blue [0]     +395ms
    // T171 (4141ms): TAP yellow → buffer [1] +535ms
    // T254 (5543ms): TAP blue → blue [1]     +1402ms
    // T279 (5973ms): TAP red → red [0]       +430ms
    // T309 (6480ms): TAP red → red [1]       +507ms
    // T334 (6902ms): TAP red → red [2]       +422ms - FILLS RED
    // T376 (7626ms): TAP blue → buffer [2]   +724ms
    // T403 (8093ms): TAP green → buffer [3]  +467ms
    //
    // Critical sequence after taps:
    // T466 (9150ms): TRANSFER green → green tray [slot 1], blue tray hidden
    // T489 (9550ms): yellow tray revealed at position 1 (green shifts to 0)
    // T495 (9650ms): POSITION_MISMATCH - green screw landed at wrong position!

    const positionMismatches: string[] = [];
    const allLogs: string[] = [];
    page.on('console', (msg) => {
      const text = msg.text();
      // Capture all game logs for debugging
      if (text.includes('[T')) {
        allLogs.push(text);
      }
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

    // Use EXACT delays from bug report to match timing
    // Critical: T376→T403 is only 467ms, but green tray reveals at T389 (224ms after blue tap)
    // Green tap must happen DURING tray animation (before T407 finalize) to go to buffer
    // Bug shows: T403 TAP green → buffer [3] with "animating=true busy=true"
    const actions = [
      { x: 400, y: 1369, delay: 395, comment: 'green → buffer [0]' },
      { x: 485, y: 1289, delay: 535, comment: 'blue → blue [0]' },
      { x: 680, y: 1304, delay: 1402, comment: 'yellow → buffer [1]' },
      { x: 765, y: 1434, delay: 430, comment: 'blue → blue [1]' },
      { x: 595, y: 1434, delay: 507, comment: 'red → red [0]' },
      { x: 315, y: 1289, delay: 422, comment: 'red → red [1]' },
      { x: 400, y: 1169, delay: 724, comment: 'red → red [2] - FILLS RED' },
      {
        x: 360,
        y: 949,
        delay: 175,
        comment: 'blue → buffer [2] - triggers tray transition',
      },
      // Critical: must tap green DURING tray animation (within ~300ms window)
      // Bug report: 467ms delay, but tray transition takes ~400ms
      // Tap fast enough to catch tray mid-animation
      {
        x: 660,
        y: 949,
        delay: 3000,
        comment: 'green → buffer [3] (must go to buffer!)',
      },
    ];

    for (const action of actions) {
      console.log(
        `Tap (${String(action.x)}, ${String(action.y)}) - ${action.comment}`
      );
      await harness.act({ type: 'pointerDown', x: action.x, y: action.y });
      await harness.act({ type: 'pointerUp', x: action.x, y: action.y });
      await page.waitForTimeout(action.delay);
    }

    // Wait for all animations and auto-transfers to complete
    await page.waitForTimeout(4000);

    // Verify screws are at correct positions - compare to bug report game-state.json
    const screws = await harness.queryByComponent('screw');
    const trays = await harness.queryByComponent('tray');

    // Bug report final state:
    // - green screw (id 10) at x=109.5 in green tray slot 0 ✓
    // - yellow screw (id 13) at x=324.5 in yellow tray slot 0 ✓
    // - green screw (id 22) at x=344.5 in green tray slot 1 ✗ WRONG - should be ~149.5

    const screwsInTray = screws.filter((s) => {
      const sc = s.components as { screw?: { state?: string } };
      return sc.screw?.state === 'inTray';
    });

    // Print relevant logs for comparison with bug report
    console.log('\n=== GAME LOGS (compare to bug report console-log.txt) ===');
    const relevantLogs = allLogs.filter(
      (l) =>
        l.includes('TRANSFER') ||
        l.includes('TRAY:') ||
        l.includes('POSITION_MISMATCH') ||
        l.includes('TAP:')
    );
    for (const log of relevantLogs) {
      console.log(log);
    }

    console.log('\n=== FINAL SCREW POSITIONS (compare to bug report) ===');
    console.log(
      'Bug report showed green screw at x=344.5 (WRONG, expected 149.5)'
    );

    for (const s of screwsInTray) {
      const sc = s.components as {
        screw?: { color?: string; slotIndex?: number };
      };
      const screwColor = sc.screw?.color;
      const slotIndex = sc.screw?.slotIndex;

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
        const match = screwColor === trayColor ? '✓' : '✗ WRONG POSITION!';
        console.log(
          `${String(screwColor)} screw [slot ${String(slotIndex)}] at x=${String(s.position.x)} → ${String(trayColor)} tray ${match}`
        );

        // Fail if screw is in wrong tray
        expect(
          screwColor,
          `${String(screwColor)} screw ended up in ${String(trayColor)} tray - position bug!`
        ).toBe(trayColor);
      }
    }

    // Assert NO position mismatches detected by our diagnostic
    expect(
      positionMismatches,
      `Position mismatches detected:\n${positionMismatches.join('\n')}`
    ).toHaveLength(0);
  });
});
