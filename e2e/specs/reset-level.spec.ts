/**
 * Tests for level reset functionality.
 * Verifies that all game state is properly cleaned up when the level is reset.
 */

import { test, expect } from '@playwright/test';
import { attachTelemetry } from '../helpers/telemetry';
import {
  createHarnessClient,
  waitForScrewState,
  waitForBufferState,
  waitForCondition,
} from '../helpers/harness';

test.describe('Level Reset', () => {
  test('reset cleans up screws in buffer tray', async ({ page }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1&region=test&level=0');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);

    // Get initial screw count
    const initialScrews = await harness.queryByComponent('screw');
    const initialScrewCount = initialScrews.length;
    expect(initialScrewCount).toBeGreaterThan(0);

    // Verify all screws are initially in 'inBoard' state
    for (const screw of initialScrews) {
      const screwComponent = screw.components.screw as { state: string };
      expect(screwComponent.state).toBe('inBoard');
    }

    // Get buffer tray to verify it starts empty
    const bufferTrays = await harness.queryByComponent('bufferTray');
    expect(bufferTrays.length).toBe(1);
    const bufferTray = bufferTrays[0]!;
    const initialBufferComponent = bufferTray.components.bufferTray as {
      screwIds: string[];
    };
    expect(initialBufferComponent.screwIds.length).toBe(0);

    // Tap a yellow screw to move it to buffer (yellow tray is hidden initially)
    // Using centered coordinates: Board 2 at world (680, 1369), yellow screw at local (135, 65)
    // World position: (680-135+135, 1369-130+65) = (680, 1304)
    await harness.act({ type: 'pointerDown', x: 680, y: 1304 });
    await harness.act({ type: 'pointerUp', x: 680, y: 1304 });

    // Wait for screw to reach buffer state
    await waitForScrewState(harness, page, 'yellow', 'inBuffer', {
      timeout: 3000,
    });

    // Verify screw is now in buffer
    const bufferTraysAfterTap = await harness.queryByComponent('bufferTray');
    const bufferAfterTap = bufferTraysAfterTap[0]!;
    const bufferComponentAfterTap = bufferAfterTap.components.bufferTray as {
      screwIds: string[];
    };
    expect(bufferComponentAfterTap.screwIds.length).toBe(1);

    // Also verify screw state changed to 'inBuffer'
    const screwsAfterTap = await harness.queryByComponent('screw');
    const bufferScrew = screwsAfterTap.find((s) => {
      const component = s.components.screw as { state: string };
      return component.state === 'inBuffer';
    });
    expect(bufferScrew).toBeDefined();

    // Store the buffer screw's entity ID for later verification
    const bufferScrewId = String(bufferScrew!.id);

    // Click restart button (position: 918, 21 in game coords, button is 140x140)
    // Center of button: 918 + 70 = 988, 21 + 70 = 91
    const restartX = 988;
    const restartY = 91;
    await harness.act({ type: 'pointerDown', x: restartX, y: restartY });
    await harness.act({ type: 'pointerUp', x: restartX, y: restartY });

    // Wait for buffer to be empty (level reloaded)
    await waitForBufferState(harness, page, 0, { timeout: 3000 });

    // Verify buffer tray is empty again
    const bufferTraysAfterReset = await harness.queryByComponent('bufferTray');
    expect(bufferTraysAfterReset.length).toBe(1);
    const bufferAfterReset = bufferTraysAfterReset[0]!;
    const bufferComponentAfterReset = bufferAfterReset.components
      .bufferTray as {
      screwIds: string[];
    };
    expect(bufferComponentAfterReset.screwIds.length).toBe(0);

    // Verify all screws are back to 'inBoard' state
    const screwsAfterReset = await harness.queryByComponent('screw');
    expect(screwsAfterReset.length).toBe(initialScrewCount);
    for (const screw of screwsAfterReset) {
      const screwComponent = screw.components.screw as { state: string };
      expect(screwComponent.state).toBe('inBoard');
    }

    // CRITICAL: Verify the old buffer screw entity no longer exists
    // This is the actual bug - the screw entity might still be in the scene
    const oldScrewStillExists = await harness.hasEntity(bufferScrewId);
    expect(oldScrewStillExists).toBe(false);
  });

  test('reset cleans up screws in colored trays', async ({ page }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1&region=test&level=0');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);

    // Get initial state
    const initialScrews = await harness.queryByComponent('screw');
    const initialScrewCount = initialScrews.length;

    // Tap a red screw to move it to the red tray (which is visible)
    // Using centered coordinates: Board 1 at world (400, 1369), red screw at local (50, 50)
    // World position: (400-135+50, 1369-130+50) = (315, 1289)
    await harness.act({ type: 'pointerDown', x: 315, y: 1289 });
    await harness.act({ type: 'pointerUp', x: 315, y: 1289 });

    // Wait for screw to reach tray state
    await waitForScrewState(harness, page, 'red', 'inTray', { timeout: 3000 });

    // Verify screw is in tray
    const screwsAfterTap = await harness.queryByComponent('screw');
    const trayScrew = screwsAfterTap.find((s) => {
      const component = s.components.screw as { state: string };
      return component.state === 'inTray';
    });
    expect(trayScrew).toBeDefined();

    const trayScrewId = String(trayScrew!.id);

    // Click restart button
    await harness.act({ type: 'pointerDown', x: 988, y: 91 });
    await harness.act({ type: 'pointerUp', x: 988, y: 91 });

    // Wait for level to fully reload with all screws in inBoard state
    await waitForCondition(
      page,
      async () => {
        const screws = await harness.queryByComponent('screw');
        // Must have the correct count AND all be in inBoard state
        if (screws.length !== initialScrewCount) return false;
        return screws.every((s) => {
          const sc = s.components.screw as { state: string };
          return sc.state === 'inBoard';
        });
      },
      {
        timeout: 5000,
        message: 'Expected all screws to be in inBoard state after reset',
      }
    );

    // Verify all screws are back to 'inBoard' state
    const screwsAfterReset = await harness.queryByComponent('screw');
    expect(screwsAfterReset.length).toBe(initialScrewCount);
    for (const screw of screwsAfterReset) {
      const screwComponent = screw.components.screw as { state: string };
      expect(screwComponent.state).toBe('inBoard');
    }

    // Verify the old tray screw entity no longer exists
    const oldScrewStillExists = await harness.hasEntity(trayScrewId);
    expect(oldScrewStillExists).toBe(false);
  });

  test('reset clears visual screw remnants from buffer tray area', async ({
    page,
  }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1&region=test&level=0');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);

    // Move a yellow screw to buffer tray (using centered coordinates)
    // Yellow screw at world (680, 1304)
    await harness.act({ type: 'pointerDown', x: 680, y: 1304 });
    await harness.act({ type: 'pointerUp', x: 680, y: 1304 });
    await waitForScrewState(harness, page, 'yellow', 'inBuffer', {
      timeout: 3000,
    });

    // Move a green screw to buffer tray (using centered coordinates)
    // Green screw at world (400, 1369) - Board 1 at (400,1369) - half(135,130) + screw(135,130)
    await harness.act({ type: 'pointerDown', x: 400, y: 1369 });
    await harness.act({ type: 'pointerUp', x: 400, y: 1369 });
    await waitForScrewState(harness, page, 'green', 'inBuffer', {
      timeout: 3000,
    });

    // Now we have 2 screws in the buffer tray

    // Click restart
    await harness.act({ type: 'pointerDown', x: 988, y: 91 });
    await harness.act({ type: 'pointerUp', x: 988, y: 91 });
    await waitForBufferState(harness, page, 0, { timeout: 3000 });

    // Verify all screws are back to 'inBoard' state (no visual remnants)
    const screwsAfterReset = await harness.queryByComponent('screw');
    for (const screw of screwsAfterReset) {
      const screwComponent = screw.components.screw as { state: string };
      expect(screwComponent.state).toBe('inBoard');
    }

    // Verify buffer tray is empty
    const bufferTrays = await harness.queryByComponent('bufferTray');
    const bufferTray = bufferTrays[0]!;
    const bufferComponent = bufferTray.components.bufferTray as {
      screwIds: string[];
    };
    expect(bufferComponent.screwIds.length).toBe(0);
  });

  test('reset preserves correct entity count', async ({ page }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1&region=test&level=0');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);

    // Get initial entity counts
    const initialScrews = await harness.queryByComponent('screw');
    const initialTrays = await harness.queryByComponent('tray');
    const initialBufferTrays = await harness.queryByComponent('bufferTray');
    const initialTotalEntities = await harness.getEntityCount();

    // Move some screws (using centered coordinates)
    await harness.act({ type: 'pointerDown', x: 315, y: 1289 }); // Red at (315, 1289)
    await harness.act({ type: 'pointerUp', x: 315, y: 1289 });
    await waitForScrewState(harness, page, 'red', 'inTray', { timeout: 3000 });

    await harness.act({ type: 'pointerDown', x: 680, y: 1304 }); // Yellow to buffer at (680, 1304)
    await harness.act({ type: 'pointerUp', x: 680, y: 1304 });
    await waitForScrewState(harness, page, 'yellow', 'inBuffer', {
      timeout: 3000,
    });

    // Click restart
    await harness.act({ type: 'pointerDown', x: 988, y: 91 });
    await harness.act({ type: 'pointerUp', x: 988, y: 91 });

    // Wait for level to fully reload with correct entity counts
    await waitForCondition(
      page,
      async () => {
        const screws = await harness.queryByComponent('screw');
        // Must have correct count AND all in inBoard state
        if (screws.length !== initialScrews.length) return false;
        return screws.every((s) => {
          const sc = s.components.screw as { state: string };
          return sc.state === 'inBoard';
        });
      },
      {
        timeout: 5000,
        message: 'Expected all screws to be in inBoard state after reset',
      }
    );

    // Verify entity counts match initial state
    const resetScrews = await harness.queryByComponent('screw');
    const resetTrays = await harness.queryByComponent('tray');
    const resetBufferTrays = await harness.queryByComponent('bufferTray');
    const resetTotalEntities = await harness.getEntityCount();

    expect(resetScrews.length).toBe(initialScrews.length);
    expect(resetTrays.length).toBe(initialTrays.length);
    expect(resetBufferTrays.length).toBe(initialBufferTrays.length);
    expect(resetTotalEntities).toBe(initialTotalEntities);
  });
});
