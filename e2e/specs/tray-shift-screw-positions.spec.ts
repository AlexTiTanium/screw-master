/**
 * E2E tests for tray shift screw position bug.
 *
 * When a colored tray shifts position (after another tray is resolved),
 * screws already in that tray should move with it.
 *
 * Bug: Screws remain at their old absolute positions while the tray moves,
 * causing visual misalignment.
 */

import { test, expect } from '@playwright/test';
import { attachTelemetry } from '../helpers/telemetry';
import {
  createHarnessClient,
  type EntitySnapshot,
  waitForScrewState,
  waitForAnimationsToSettle,
  waitForCondition,
} from '../helpers/harness';

test.describe('Tray Shift Screw Positions', () => {
  test('screws in shifted tray move with the tray', async ({ page }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1&region=test&level=0');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);

    // Test level layout:
    // - Red tray at displayOrder 0, capacity 3
    // - Blue tray at displayOrder 1, capacity 3
    // - Green tray at displayOrder 2 (hidden)
    // - Yellow tray at displayOrder 3 (hidden)
    //
    // Tray slot X positions (from TRAY_FRAME_LAYOUT):
    // - Slot 0: 57
    // - Slot 1: 252

    // Step 1: Place one blue screw in blue tray (at position 1)
    // Blue screw on Board 1 at world (485, 1289)
    // Calculated: board local (-140, 170) → world (400, 1369)
    // + screw local (220, 50) adjusted for board size (270x260)
    // = (400 - 135 + 220, 1369 - 130 + 50) = (485, 1289)
    await harness.act({ type: 'pointerDown', x: 485, y: 1289 });
    await harness.act({ type: 'pointerUp', x: 485, y: 1289 });
    await waitForScrewState(harness, page, 'blue', 'inTray', { timeout: 3000 });

    // Verify blue screw is in blue tray
    let screws = await harness.queryByComponent('screw');
    const blueScrewInTray = screws.find(
      (s: EntitySnapshot) =>
        (s.components.screw as { color: string; state: string }).color ===
          'blue' && (s.components.screw as { state: string }).state === 'inTray'
    );
    expect(blueScrewInTray).toBeDefined();

    // Record blue screw's X position while blue tray is at displayOrder 1
    const blueScrewXBefore = blueScrewInTray!.position.x;

    // Get blue tray's X position before shift
    let trays = await harness.queryByComponent('tray');
    const blueTrayBefore = trays.find(
      (t: EntitySnapshot) =>
        (t.components.tray as { color: string }).color === 'blue'
    );
    expect(blueTrayBefore).toBeDefined();
    const blueTrayXBefore = blueTrayBefore!.position.x;
    expect(
      (blueTrayBefore!.components.tray as { displayOrder: number }).displayOrder
    ).toBe(1);

    // Step 2: Fill the red tray to trigger hide/shift/reveal
    // Red screws in test level:
    // - Board 1 red screw at world (315, 1289)
    // - Board 2 red screw at world (595, 1434)
    // - Board 3 red screw at world (450, 1149)

    // First red screw (Board 1): local (50, 50) on 270x260 board at local (-140, 170)
    // = (540-140-135+50, 1199+170-130+50) = (315, 1289)
    await harness.act({ type: 'pointerDown', x: 315, y: 1289 });
    await harness.act({ type: 'pointerUp', x: 315, y: 1289 });
    await waitForScrewState(harness, page, 'red', 'inTray', { timeout: 3000 });

    // Second red screw (Board 2): local (50, 195) on 270x260 board at local (140, 170)
    // = (540+140-135+50, 1199+170-130+195) = (595, 1434)
    await harness.act({ type: 'pointerDown', x: 595, y: 1434 });
    await harness.act({ type: 'pointerUp', x: 595, y: 1434 });
    await waitForScrewState(harness, page, 'red', 'inTray', {
      timeout: 3000,
      count: 2,
    });

    // Third red screw (Board 3): local (135, 200) on 270x260 board at local (-140, -100)
    // = (540-140-135+135, 1199-100-130+200) = (400, 1169)
    await harness.act({ type: 'pointerDown', x: 400, y: 1169 });
    await harness.act({ type: 'pointerUp', x: 400, y: 1169 });

    // Wait for hide/shift/reveal animations to complete
    await waitForCondition(
      page,
      async () => {
        const t = await harness.queryByComponent('tray');
        const blueTray = t.find(
          (tr: EntitySnapshot) =>
            (tr.components.tray as { color: string }).color === 'blue'
        );
        if (!blueTray) return false;
        return (
          (blueTray.components.tray as { displayOrder: number })
            .displayOrder === 0
        );
      },
      {
        timeout: 5000,
        message: 'Expected blue tray to shift to displayOrder 0',
      }
    );

    // Additional settle time for position animation
    await waitForAnimationsToSettle(harness, page, {
      timeout: 3000,
      stableTime: 200,
    });

    // Step 3: Verify blue tray shifted from position 1 to position 0
    trays = await harness.queryByComponent('tray');
    const blueTrayAfter = trays.find(
      (t: EntitySnapshot) =>
        (t.components.tray as { color: string }).color === 'blue'
    );
    expect(blueTrayAfter).toBeDefined();
    expect(
      (blueTrayAfter!.components.tray as { displayOrder: number }).displayOrder
    ).toBe(0);

    const blueTrayXAfter = blueTrayAfter!.position.x;

    // Calculate the delta the tray moved
    const trayDeltaX = blueTrayXAfter - blueTrayXBefore;
    // Tray should have moved from slot 1 (252) to slot 0 (57)
    // Delta should be approximately -195
    expect(trayDeltaX).toBeLessThan(-100);

    // Step 4: Verify the blue screw moved with the tray
    screws = await harness.queryByComponent('screw');
    const blueScrewAfter = screws.find(
      (s: EntitySnapshot) =>
        (s.components.screw as { color: string; state: string }).color ===
          'blue' && (s.components.screw as { state: string }).state === 'inTray'
    );
    expect(blueScrewAfter).toBeDefined();

    const blueScrewXAfter = blueScrewAfter!.position.x;
    const screwDeltaX = blueScrewXAfter - blueScrewXBefore;

    // The screw should have moved by the same amount as the tray
    // Allow 5px tolerance for animation timing differences
    expect(Math.abs(screwDeltaX - trayDeltaX)).toBeLessThan(5);
  });
});
