/**
 * Misplacement bug reproduction test.
 * Generated from user action log to reproduce potential placement bugs.
 */
/* eslint-disable @typescript-eslint/restrict-template-expressions */

import { test, expect } from '@playwright/test';
import { attachTelemetry } from '../helpers/telemetry';
import { createHarnessClient } from '../helpers/harness';

// Use larger viewport for better screenshot quality
test.use({
  video: { mode: 'on', size: { width: 540, height: 960 } },
  viewport: { width: 540, height: 960 },
});

test.describe('Misplacement Bug', () => {
  test('reproduce bug from user action log v2', async ({ page }) => {
    // Capture ALL relevant game console logs for debugging
    page.on('console', (msg) => {
      const text = msg.text();
      if (
        text.includes('TAP:') ||
        text.includes('TRAY') ||
        text.includes('TRANSFER:') ||
        text.includes('SNAP:') ||
        text.includes('PLACEMENT:') ||
        text.includes('AUTO_TRANSFER') ||
        text.includes('BLOCKED:')
      ) {
        console.log(`[GAME] ${text}`);
      }
    });

    attachTelemetry(page);
    await page.goto('/?testMode=1&region=test&level=0');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);

    // Wait a moment for the level to fully render
    await page.waitForTimeout(500);

    // Take initial screenshot
    await page.screenshot({
      path: 'e2e/screenshots/misplacement-01-initial.png',
    });

    // Debug: Log initial screw positions to verify coordinates
    const initialScrews = await harness.queryByComponent('screw');

    console.log(
      'Initial screw positions:',
      initialScrews.map((s) => ({
        pos: s.position,
        color: (s.components as { screw?: { color?: string } }).screw?.color,
      }))
    );

    // Action sequence from user log v2 - exact sequence that triggered misplacement
    // Key: TAP 7 fills red tray, TAP 8 happens during tray transitions
    const screwSequence = [
      // TAP 1: (595, 1434) → red screw → red tray [slot 0]
      { x: 595, y: 1434, delay: 800, comment: 'red → red tray [0]' },
      // TAP 2: (765, 1434) → blue screw → blue tray [slot 0]
      { x: 765, y: 1434, delay: 800, comment: 'blue → blue tray [0]' },
      // TAP 3: (680, 1304) → yellow screw → buffer [slot 0] (no yellow tray visible)
      { x: 680, y: 1304, delay: 800, comment: 'yellow → buffer [0]' },
      // TAP 4: (485, 1289) → blue screw → blue tray [slot 1]
      { x: 485, y: 1289, delay: 800, comment: 'blue → blue tray [1]' },
      // TAP 5: (400, 1369) → green screw → buffer [slot 1] (no green tray visible)
      { x: 400, y: 1369, delay: 800, comment: 'green → buffer [1]' },
      // TAP 6: (315, 1289) → red screw → red tray [slot 1]
      { x: 315, y: 1289, delay: 800, comment: 'red → red tray [1]' },
      // TAP 7: (400, 1169) → red screw → red tray [slot 2] - FILLS RED TRAY!
      // TRAY: red tray hidden (was full)
      // TRAY: green tray revealed at position 1
      {
        x: 400,
        y: 1169,
        delay: 300, // SHORT delay to simulate rapid clicking during transitions
        comment: 'red → red tray [2], red tray hides, green reveals',
      },
      // TAP 8: (660, 949) → green screw → SHOULD go to buffer or NEW green tray
      // BUG: This tap happened during tray transitions and went to WRONG tray!
      {
        x: 660,
        y: 949,
        delay: 1500, // Wait for all transitions to complete
        comment:
          'green screw - BUG TARGET: should go to buffer during transitions',
      },
    ];

    for (let i = 0; i < screwSequence.length; i++) {
      const action = screwSequence[i];
      if (!action) continue;

      // Log action for debugging

      console.log(
        `\n--- Action ${i + 1}: Tapping (${action.x}, ${action.y}) - ${action.comment}`
      );

      // Find screws near target position before tap
      const screwsBefore = await harness.queryByComponent('screw');
      const nearbyScrew = screwsBefore.find((s) => {
        const dx = Math.abs(s.position.x - action.x);
        const dy = Math.abs(s.position.y - action.y);
        return dx < 50 && dy < 50;
      });

      if (nearbyScrew) {
        console.log(
          `Found screw at (${nearbyScrew.position.x}, ${nearbyScrew.position.y})`
        );
      } else {
        console.log(`WARNING: No screw found near (${action.x}, ${action.y})`);

        console.log(
          'Available screws:',
          screwsBefore
            .filter((s) => {
              const sc = s.components as { screw?: { state?: string } };
              return sc.screw?.state === 'inBoard';
            })
            .map((s) => `(${s.position.x}, ${s.position.y})`)
        );
      }

      // Count screws in board before tap
      const inBoardBefore = screwsBefore.filter((s) => {
        const sc = s.components as { screw?: { state?: string } };
        return sc.screw?.state === 'inBoard';
      }).length;

      // Tap the screw
      const downResult = await harness.act({
        type: 'pointerDown',
        x: action.x,
        y: action.y,
      });
      const upResult = await harness.act({
        type: 'pointerUp',
        x: action.x,
        y: action.y,
      });

      console.log(
        `Pointer results: down=${downResult.success}, up=${upResult.success}`
      );

      // Wait for animation
      await page.waitForTimeout(action.delay);

      // Count screws in board after tap
      const screwsAfter = await harness.queryByComponent('screw');
      const inBoardAfter = screwsAfter.filter((s) => {
        const sc = s.components as { screw?: { state?: string } };
        return sc.screw?.state === 'inBoard';
      }).length;

      console.log(
        `Screws in board: ${inBoardBefore} → ${inBoardAfter} (${inBoardBefore - inBoardAfter} removed)`
      );
    }

    // Wait a moment to show the final state
    await page.waitForTimeout(2000);

    // Take final screenshot
    await page.screenshot({
      path: 'e2e/screenshots/misplacement-02-final.png',
    });

    // Verify some screws were processed
    const finalScrews = await harness.queryByComponent('screw');

    // Log ALL screws with their states and positions

    console.log('\n=== FINAL SCREW STATES ===');
    for (const s of finalScrews) {
      const sc = s.components as {
        screw?: { state?: string; color?: string; targetTrayColor?: string };
      };

      console.log(
        `${sc.screw?.color} screw at (${s.position.x}, ${s.position.y}) - state: ${sc.screw?.state}, targetTray: ${sc.screw?.targetTrayColor ?? 'none'}`
      );
    }

    const screwsInBoard = finalScrews.filter((s) => {
      const sc = s.components as { screw?: { state?: string } };
      return sc.screw?.state === 'inBoard';
    });

    console.log(`\nFinal state: ${screwsInBoard.length} screws still in board`);

    // Log tray states
    const trays = await harness.queryByComponent('tray');

    console.log('\n=== FINAL TRAY STATES ===');
    for (const t of trays) {
      const tc = t.components as {
        tray?: {
          color?: string;
          screwCount?: number;
          capacity?: number;
          displayOrder?: number;
          isBuffer?: boolean;
        };
      };

      console.log(
        `${tc.tray?.color} tray: ${tc.tray?.screwCount}/${tc.tray?.capacity} screws, displayOrder=${tc.tray?.displayOrder}, isBuffer=${tc.tray?.isBuffer}, visible=${t.visible}`
      );
    }

    // Count screws by state
    const screwsByState: Record<string, number> = {};
    for (const s of finalScrews) {
      const sc = s.components as { screw?: { state?: string } };
      const state = sc.screw?.state ?? 'unknown';
      screwsByState[state] = (screwsByState[state] ?? 0) + 1;
    }

    console.log('\n=== SCREWS BY STATE ===');

    console.log(screwsByState);

    console.log(
      `Total screws remaining in ECS: ${finalScrews.length} (started with 11)`
    );

    // Check buffer tray
    const bufferTray = trays.find((t) => {
      const tc = t.components as { tray?: { isBuffer?: boolean } };
      return tc.tray?.isBuffer === true;
    });
    if (bufferTray) {
      const bc = bufferTray.components as { tray?: { screwCount?: number } };

      console.log(`\nBuffer tray has ${bc.tray?.screwCount} screws`);
    }

    // Check for MISPLACEMENT: screws in wrong tray based on position

    console.log('\n=== MISPLACEMENT CHECK ===');
    const screwsInTray = finalScrews.filter((s) => {
      const sc = s.components as { screw?: { state?: string } };
      return sc.screw?.state === 'inTray';
    });

    // Assign each screw to its nearest tray and check color match
    // Tray slot spacing is ~195px, so threshold should be half that (~97px)
    const TRAY_ASSIGNMENT_THRESHOLD = 97;

    for (const s of screwsInTray) {
      const sc = s.components as { screw?: { color?: string } };
      const screwColor = sc.screw?.color;

      // Find the nearest colored tray
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

      if (nearestTray && nearestDistance < TRAY_ASSIGNMENT_THRESHOLD) {
        const tc = nearestTray.components as { tray?: { color?: string } };
        const trayColor = tc.tray?.color ?? 'unknown';
        const match = screwColor === trayColor ? '✓' : '✗ MISPLACED!';

        console.log(
          `  ${String(screwColor)} screw at x=${String(s.position.x)} → ${trayColor} tray at x=${String(nearestTray.position.x)} ${match}`
        );

        // Fail the test if misplaced
        expect(
          screwColor,
          `Screw color mismatch: ${String(screwColor)} in ${trayColor} tray`
        ).toBe(trayColor);
      }
    }

    // The video will be saved automatically by Playwright
  });

  test('reproduce bug from user action log v3 - different tap order', async ({
    page,
  }) => {
    // Capture ALL relevant game console logs for debugging
    page.on('console', (msg) => {
      const text = msg.text();
      if (
        text.includes('TAP:') ||
        text.includes('TRAY') ||
        text.includes('TRANSFER:') ||
        text.includes('SNAP:') ||
        text.includes('PLACEMENT:') ||
        text.includes('AUTO_TRANSFER') ||
        text.includes('BLOCKED:')
      ) {
        console.log(`[GAME] ${text}`);
      }
    });

    attachTelemetry(page);
    await page.goto('/?testMode=1&region=test&level=0');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);

    // Wait a moment for the level to fully render
    await page.waitForTimeout(500);

    // Take initial screenshot
    await page.screenshot({
      path: 'e2e/screenshots/misplacement-v3-01-initial.png',
    });

    // Action sequence from user log v3 - different order that may trigger bug
    // Note: This sequence starts with blue, then yellow/green to buffer, then red
    const screwSequence = [
      // TAP 1: blue screw → blue tray [slot 0]
      { x: 765, y: 1434, delay: 800, comment: 'blue → blue tray [0]' },
      // TAP 2: yellow screw → buffer [slot 0]
      { x: 680, y: 1304, delay: 800, comment: 'yellow → buffer [0]' },
      // TAP 3: green screw → buffer [slot 1]
      { x: 400, y: 1369, delay: 800, comment: 'green → buffer [1]' },
      // TAP 4: red screw → red tray [slot 0]
      { x: 595, y: 1434, delay: 800, comment: 'red → red tray [0]' },
      // TAP 5: blue screw → blue tray [slot 1]
      { x: 485, y: 1289, delay: 800, comment: 'blue → blue tray [1]' },
      // TAP 6: red screw → red tray [slot 1]
      { x: 315, y: 1289, delay: 800, comment: 'red → red tray [1]' },
      // TAP 7: red screw → red tray [slot 2] - FILLS RED TRAY!
      // TRAY: red tray hidden (was full)
      // TRAY: green tray revealed at position 1
      {
        x: 400,
        y: 1169,
        delay: 300, // SHORT delay to simulate rapid clicking during transitions
        comment: 'red → red tray [2], red tray hides, green reveals',
      },
      // TAP 8: (360, 949) → blue screw → buffer [slot 2]
      // This happens DURING tray transition - should go to buffer
      {
        x: 360,
        y: 949,
        delay: 300,
        comment: 'blue screw during transition - should go to buffer',
      },
      // TAP 9: (660, 949) → green screw → green tray [slot 1]
      // After transitions complete, green screw should go to newly revealed green tray
      {
        x: 660,
        y: 949,
        delay: 1500,
        comment: 'green screw - should go to green tray after transitions',
      },
    ];

    for (let i = 0; i < screwSequence.length; i++) {
      const action = screwSequence[i];
      if (!action) continue;

      console.log(
        `\n--- Action ${i + 1}: Tapping (${action.x}, ${action.y}) - ${action.comment}`
      );

      // Find screws near target position before tap
      const screwsBefore = await harness.queryByComponent('screw');
      const nearbyScrew = screwsBefore.find((s) => {
        const dx = Math.abs(s.position.x - action.x);
        const dy = Math.abs(s.position.y - action.y);
        return dx < 50 && dy < 50;
      });

      if (nearbyScrew) {
        const sc = nearbyScrew.components as { screw?: { color?: string } };
        console.log(
          `Found ${sc.screw?.color} screw at (${nearbyScrew.position.x}, ${nearbyScrew.position.y})`
        );
      } else {
        console.log(`WARNING: No screw found near (${action.x}, ${action.y})`);
        const available = screwsBefore
          .filter((s) => {
            const sc = s.components as { screw?: { state?: string } };
            return sc.screw?.state === 'inBoard';
          })
          .map((s) => {
            const sc = s.components as { screw?: { color?: string } };
            return `${sc.screw?.color}@(${s.position.x}, ${s.position.y})`;
          });
        console.log('Available screws:', available);
      }

      // Count screws in board before tap
      const inBoardBefore = screwsBefore.filter((s) => {
        const sc = s.components as { screw?: { state?: string } };
        return sc.screw?.state === 'inBoard';
      }).length;

      // Tap the screw
      await harness.act({ type: 'pointerDown', x: action.x, y: action.y });
      await harness.act({ type: 'pointerUp', x: action.x, y: action.y });

      // Wait for animation
      await page.waitForTimeout(action.delay);

      // Count screws in board after tap
      const screwsAfter = await harness.queryByComponent('screw');
      const inBoardAfter = screwsAfter.filter((s) => {
        const sc = s.components as { screw?: { state?: string } };
        return sc.screw?.state === 'inBoard';
      }).length;

      console.log(
        `Screws in board: ${inBoardBefore} → ${inBoardAfter} (${inBoardBefore - inBoardAfter} removed)`
      );
    }

    // Wait for all animations to complete
    await page.waitForTimeout(2000);

    // Take final screenshot
    await page.screenshot({
      path: 'e2e/screenshots/misplacement-v3-02-final.png',
    });

    // Verify no misplacement
    const finalScrews = await harness.queryByComponent('screw');
    const trays = await harness.queryByComponent('tray');

    console.log('\n=== FINAL SCREW STATES ===');
    for (const s of finalScrews) {
      const sc = s.components as {
        screw?: { state?: string; color?: string };
      };
      console.log(
        `${sc.screw?.color} screw at (${s.position.x}, ${s.position.y}) - state: ${sc.screw?.state}`
      );
    }

    console.log('\n=== FINAL TRAY STATES ===');
    for (const t of trays) {
      const tc = t.components as {
        tray?: {
          color?: string;
          screwCount?: number;
          capacity?: number;
          displayOrder?: number;
          isBuffer?: boolean;
        };
      };
      console.log(
        `${tc.tray?.color} tray: ${tc.tray?.screwCount}/${tc.tray?.capacity} screws, displayOrder=${tc.tray?.displayOrder}, isBuffer=${tc.tray?.isBuffer}`
      );
    }

    // Check for MISPLACEMENT
    console.log('\n=== MISPLACEMENT CHECK ===');
    const screwsInTray = finalScrews.filter((s) => {
      const sc = s.components as { screw?: { state?: string } };
      return sc.screw?.state === 'inTray';
    });

    const TRAY_ASSIGNMENT_THRESHOLD = 97;

    for (const s of screwsInTray) {
      const sc = s.components as { screw?: { color?: string } };
      const screwColor = sc.screw?.color;

      // Find the nearest colored tray
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

      if (nearestTray && nearestDistance < TRAY_ASSIGNMENT_THRESHOLD) {
        const tc = nearestTray.components as { tray?: { color?: string } };
        const trayColor = tc.tray?.color ?? 'unknown';
        const match = screwColor === trayColor ? '✓' : '✗ MISPLACED!';

        console.log(
          `  ${String(screwColor)} screw at x=${String(s.position.x)} → ${trayColor} tray at x=${String(nearestTray.position.x)} ${match}`
        );

        // Fail the test if misplaced
        expect(
          screwColor,
          `Screw color mismatch: ${String(screwColor)} in ${trayColor} tray`
        ).toBe(trayColor);
      }
    }
  });
});
