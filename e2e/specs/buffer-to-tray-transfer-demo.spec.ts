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

    // PHASE 1: Add screws to buffer (green/yellow trays hidden)
    // green(135,130) → (400, 1369), yellow(135,65) → (680, 1304)
    await harness.act({ type: 'pointerDown', x: 400, y: 1369 });
    await harness.act({ type: 'pointerUp', x: 400, y: 1369 });
    await page.waitForTimeout(600);

    await harness.act({ type: 'pointerDown', x: 680, y: 1304 });
    await harness.act({ type: 'pointerUp', x: 680, y: 1304 });
    await page.waitForTimeout(800);

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

    // PHASE 2: Fill red tray to trigger reveal of green tray
    await harness.act({ type: 'pointerDown', x: 315, y: 1289 });
    await harness.act({ type: 'pointerUp', x: 315, y: 1289 });
    await page.waitForTimeout(600);

    await harness.act({ type: 'pointerDown', x: 595, y: 1434 });
    await harness.act({ type: 'pointerUp', x: 595, y: 1434 });
    await page.waitForTimeout(600);

    await harness.act({ type: 'pointerDown', x: 400, y: 1169 });
    await harness.act({ type: 'pointerUp', x: 400, y: 1169 });
    await page.waitForTimeout(2000); // Wait for hide/shift/reveal/transfer

    // Verify green screw transferred from buffer to green tray
    screws = await harness.queryByComponent('screw');
    const greenInTray = screws.filter(
      (s: EntitySnapshot) =>
        (s.components.screw as { color: string; state: string }).color ===
          'green' &&
        (s.components.screw as { state: string }).state === 'inTray'
    );
    expect(greenInTray.length).toBeGreaterThanOrEqual(1);

    // PHASE 3: Fill blue tray to trigger reveal of yellow tray
    await harness.act({ type: 'pointerDown', x: 485, y: 1289 });
    await harness.act({ type: 'pointerUp', x: 485, y: 1289 });
    await page.waitForTimeout(600);

    await harness.act({ type: 'pointerDown', x: 765, y: 1434 });
    await harness.act({ type: 'pointerUp', x: 765, y: 1434 });
    await page.waitForTimeout(600);

    await harness.act({ type: 'pointerDown', x: 360, y: 949 });
    await harness.act({ type: 'pointerUp', x: 360, y: 949 });
    await page.waitForTimeout(2500); // Wait for hide/shift/reveal/transfer

    // Verify yellow screw transferred from buffer to yellow tray
    screws = await harness.queryByComponent('screw');
    const yellowInTray = screws.filter(
      (s: EntitySnapshot) =>
        (s.components.screw as { color: string; state: string }).color ===
          'yellow' &&
        (s.components.screw as { state: string }).state === 'inTray'
    );
    expect(yellowInTray.length).toBeGreaterThanOrEqual(1);
  });
});
