/**
 * Demo test for buffer-to-tray transfer animation.
 *
 * This test demonstrates screws going through the buffer tray first,
 * then transferring correctly to colored trays when they become available.
 *
 * Flow:
 * 1. Add green/yellow screws → go to buffer (their trays are hidden)
 * 2. Fill red tray → triggers hide/shift/reveal
 * 3. Green tray becomes visible, buffer screws transfer to it
 * 4. Fill blue tray → triggers another cycle
 * 5. Yellow tray becomes visible, buffer screws transfer to it
 */

import { test, expect } from '@playwright/test';
import { attachTelemetry } from '../helpers/telemetry';
import { createHarnessClient, type EntitySnapshot } from '../helpers/harness';

test.describe('Buffer to Tray Transfer Demo', () => {
  test('screws transfer from buffer to colored trays correctly', async ({
    page,
  }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1&region=test&level=0');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);
    await page.waitForTimeout(1000);

    // Test level layout:
    // - Red tray at displayOrder 0, capacity 3
    // - Blue tray at displayOrder 1, capacity 3
    // - Green tray at displayOrder 2 (hidden initially)
    // - Yellow tray at displayOrder 3 (hidden initially)
    //
    // Board dimensions (from manifest):
    // - walnut/mahogany/birch-square: 270x260
    // - pine-horizontal: 501x317
    //
    // Coordinate calculation:
    // World = playAreaCenter(540,1199) + boardLocal - boardHalfSize + screwLocal
    //
    // Board 1 (walnut, layer 1, local -140,170):
    //   boardWorld = (540-140, 1199+170) = (400, 1369)
    //   boardTopLeft = (400-135, 1369-130) = (265, 1239)
    //   red(50,50) → (265+50, 1239+50) = (315, 1289)
    //   blue(220,50) → (265+220, 1239+50) = (485, 1289)
    //   green(135,130) → (265+135, 1239+130) = (400, 1369)
    //
    // Board 2 (birch, layer 2, local 140,170):
    //   boardWorld = (540+140, 1199+170) = (680, 1369)
    //   boardTopLeft = (680-135, 1369-130) = (545, 1239)
    //   yellow(135,65) → (545+135, 1239+65) = (680, 1304)
    //   red(50,195) → (545+50, 1239+195) = (595, 1434)
    //   blue(220,195) → (545+220, 1239+195) = (765, 1434)
    //
    // Board 3 (mahogany, layer 3, local -140,-100):
    //   boardWorld = (540-140, 1199-100) = (400, 1099)
    //   boardTopLeft = (400-135, 1099-130) = (265, 969)
    //   green(50,50) → (265+50, 969+50) = (315, 1019)
    //   yellow(220,50) → (265+220, 969+50) = (485, 1019)
    //   red(135,200) → (265+135, 969+200) = (400, 1169)
    //
    // Board 4 (pine, layer 4, local -30,-250):
    //   boardWorld = (540-30, 1199-250) = (510, 949)
    //   boardTopLeft = (510-250, 949-158) = (260, 791)
    //   blue(100,158) → (260+100, 791+158) = (360, 949)
    //   green(400,158) → (260+400, 791+158) = (660, 949)

    // ============================================
    // PHASE 1: Add screws to buffer
    // Green and yellow trays are hidden, so screws go to buffer
    // ============================================

    // Add first green screw (Board 1, layer 1): green(135,130) → (400, 1369)
    await harness.act({ type: 'pointerDown', x: 400, y: 1369 });
    await harness.act({ type: 'pointerUp', x: 400, y: 1369 });
    await page.waitForTimeout(1000);

    // Add first yellow screw (Board 2, layer 2): yellow(135,65) → (680, 1304)
    await harness.act({ type: 'pointerDown', x: 680, y: 1304 });
    await harness.act({ type: 'pointerUp', x: 680, y: 1304 });
    await page.waitForTimeout(1000);

    // Verify screws are in buffer
    let screws = await harness.queryByComponent('screw');
    const greenInBuffer = screws.filter(
      (s: EntitySnapshot) =>
        (s.components.screw as { color: string; state: string }).color ===
          'green' &&
        (s.components.screw as { state: string }).state === 'inBuffer'
    );
    const yellowInBuffer = screws.filter(
      (s: EntitySnapshot) =>
        (s.components.screw as { color: string; state: string }).color ===
          'yellow' &&
        (s.components.screw as { state: string }).state === 'inBuffer'
    );
    expect(greenInBuffer.length).toBe(1);
    expect(yellowInBuffer.length).toBe(1);

    // ============================================
    // PHASE 2: Fill red tray to trigger reveal of green tray
    // ============================================

    // Red screw 1 (Board 1): red(50,50) → (315, 1289)
    await harness.act({ type: 'pointerDown', x: 315, y: 1289 });
    await harness.act({ type: 'pointerUp', x: 315, y: 1289 });
    await page.waitForTimeout(800);

    // Red screw 2 (Board 2): red(50,195) → (595, 1434)
    await harness.act({ type: 'pointerDown', x: 595, y: 1434 });
    await harness.act({ type: 'pointerUp', x: 595, y: 1434 });
    await page.waitForTimeout(800);

    // Red screw 3 (Board 3): red(135,200) → (400, 1169)
    await harness.act({ type: 'pointerDown', x: 400, y: 1169 });
    await harness.act({ type: 'pointerUp', x: 400, y: 1169 });
    await page.waitForTimeout(2000); // Wait for hide/shift/reveal/transfer animations

    // Verify green screw transferred from buffer to green tray
    screws = await harness.queryByComponent('screw');
    const greenInTray = screws.filter(
      (s: EntitySnapshot) =>
        (s.components.screw as { color: string; state: string }).color ===
          'green' &&
        (s.components.screw as { state: string }).state === 'inTray'
    );
    expect(greenInTray.length).toBeGreaterThanOrEqual(1);

    // ============================================
    // PHASE 3: Fill blue tray to trigger reveal of yellow tray
    // ============================================

    // Blue screw 1 (Board 1): blue(220,50) → (485, 1289)
    await harness.act({ type: 'pointerDown', x: 485, y: 1289 });
    await harness.act({ type: 'pointerUp', x: 485, y: 1289 });
    await page.waitForTimeout(800);

    // Blue screw 2 (Board 2): blue(220,195) → (765, 1434)
    await harness.act({ type: 'pointerDown', x: 765, y: 1434 });
    await harness.act({ type: 'pointerUp', x: 765, y: 1434 });
    await page.waitForTimeout(800);

    // Blue screw 3 (Board 4): blue(100,158) → (360, 949)
    await harness.act({ type: 'pointerDown', x: 360, y: 949 });
    await harness.act({ type: 'pointerUp', x: 360, y: 949 });
    await page.waitForTimeout(2000); // Wait for hide/shift/reveal/transfer animations

    // Verify yellow screw transferred from buffer to yellow tray
    screws = await harness.queryByComponent('screw');
    const yellowInTray = screws.filter(
      (s: EntitySnapshot) =>
        (s.components.screw as { color: string; state: string }).color ===
          'yellow' &&
        (s.components.screw as { state: string }).state === 'inTray'
    );
    expect(yellowInTray.length).toBeGreaterThanOrEqual(1);

    // Final pause for video
    await page.waitForTimeout(1500);
  });
});
