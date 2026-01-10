/**
 * Tests for level reset functionality.
 * Verifies that all game state is properly cleaned up when the level is reset.
 */

import { test, expect } from '@playwright/test';
import { attachTelemetry } from '../helpers/telemetry';
import { createHarnessClient } from '../helpers/harness';

test.describe('Level Reset', () => {
  test('reset cleans up screws in buffer tray', async ({ page }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1&region=test&level=0');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);

    // Wait for level to fully render
    await page.waitForTimeout(300);

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
    // Yellow screw position from gameplay-demo: (685, 865)
    await harness.act({ type: 'pointerDown', x: 685, y: 865 });
    await harness.act({ type: 'pointerUp', x: 685, y: 865 });

    // Wait for animation to complete
    await page.waitForTimeout(800);

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

    // Wait for level to reload
    await page.waitForTimeout(500);

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

    // Wait for level to fully render
    await page.waitForTimeout(300);

    // Get initial state
    const initialScrews = await harness.queryByComponent('screw');
    const initialScrewCount = initialScrews.length;

    // Tap a red screw to move it to the red tray (which is visible)
    // Red screw position from gameplay-demo: (250, 850)
    await harness.act({ type: 'pointerDown', x: 250, y: 850 });
    await harness.act({ type: 'pointerUp', x: 250, y: 850 });

    // Wait for animation
    await page.waitForTimeout(800);

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

    // Wait for level to reload
    await page.waitForTimeout(500);

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

    await page.waitForTimeout(300);

    // Move a yellow screw to buffer tray
    await harness.act({ type: 'pointerDown', x: 685, y: 865 });
    await harness.act({ type: 'pointerUp', x: 685, y: 865 });
    await page.waitForTimeout(800);

    // Move a green screw to buffer tray
    await harness.act({ type: 'pointerDown', x: 335, y: 930 });
    await harness.act({ type: 'pointerUp', x: 335, y: 930 });
    await page.waitForTimeout(800);

    // Now we have 2 screws in the buffer tray

    // Click restart
    await harness.act({ type: 'pointerDown', x: 988, y: 91 });
    await harness.act({ type: 'pointerUp', x: 988, y: 91 });
    await page.waitForTimeout(500);

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

    await page.waitForTimeout(300);

    // Get initial entity counts
    const initialScrews = await harness.queryByComponent('screw');
    const initialTrays = await harness.queryByComponent('tray');
    const initialBufferTrays = await harness.queryByComponent('bufferTray');
    const initialTotalEntities = await harness.getEntityCount();

    // Move some screws
    await harness.act({ type: 'pointerDown', x: 250, y: 850 }); // Red
    await harness.act({ type: 'pointerUp', x: 250, y: 850 });
    await page.waitForTimeout(800);

    await harness.act({ type: 'pointerDown', x: 685, y: 865 }); // Yellow to buffer
    await harness.act({ type: 'pointerUp', x: 685, y: 865 });
    await page.waitForTimeout(800);

    // Click restart
    await harness.act({ type: 'pointerDown', x: 988, y: 91 });
    await harness.act({ type: 'pointerUp', x: 988, y: 91 });
    await page.waitForTimeout(500);

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
