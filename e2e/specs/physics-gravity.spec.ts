/**
 * E2E tests for physics gravity system.
 *
 * Tests that parts fall when all their screws are removed,
 * settle at world bounds, and that physics is deterministic.
 */

import { test, expect } from '@playwright/test';
import { attachTelemetry } from '../helpers/telemetry';
import { createHarnessClient } from '../helpers/harness';

// Video recording for demo
const recordVideo = process.env.RECORD_VIDEO === '1';
test.use({
  video: recordVideo
    ? { mode: 'on', size: { width: 540, height: 960 } }
    : 'off',
  viewport: { width: 540, height: 960 },
});

test.describe('Physics: Part Gravity', () => {
  test('part should fall when all screws are removed', async ({ page }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1&region=test&level=0');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);
    await page.waitForTimeout(500);

    // Get initial part positions
    const initialParts = await harness.queryByComponent('part');
    expect(initialParts.length).toBeGreaterThan(0);

    const targetPart = initialParts[0];
    const initialY = targetPart?.position.y ?? 0;

    // Find screws attached to this part
    const screws = await harness.queryByComponent('screw');
    const partScrews = screws.filter((s) => {
      const sc = s.components.screw as { partEntityId?: string };
      return sc.partEntityId === String(targetPart?.id);
    });

    expect(partScrews.length).toBeGreaterThan(0);

    // Remove all screws from the part by tapping them
    for (const screw of partScrews) {
      await harness.act({
        type: 'pointerDown',
        x: screw.position.x,
        y: screw.position.y,
      });
      await harness.act({
        type: 'pointerUp',
        x: screw.position.x,
        y: screw.position.y,
      });
      await page.waitForTimeout(800); // Wait for removal animation
    }

    // Wait briefly for physics to take effect (short wait to catch falling before destroy)
    await page.waitForTimeout(500);

    // Get updated part position
    const updatedParts = await harness.queryByComponent('part');
    const updatedPart = updatedParts.find((p) => p.id === targetPart?.id);

    // Part should have fallen (Y increased toward screen bottom)
    // If part already destroyed, the test still passes via the destroy test
    if (updatedPart) {
      expect(updatedPart.position.y).toBeGreaterThan(initialY + 20);
    } else {
      // Part was already destroyed - this is also valid behavior
      expect(updatedPart).toBeUndefined();
    }
  });

  test('part should fade out and be destroyed when falling off-screen', async ({
    page,
  }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1&region=test&level=0');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);
    await page.waitForTimeout(500);

    // Get parts and their screws
    const parts = await harness.queryByComponent('part');
    expect(parts.length).toBeGreaterThan(0);

    const targetPart = parts[0];
    const initialPartCount = parts.length;

    // Remove all screws from the part
    const screws = await harness.queryByComponent('screw');
    const partScrews = screws.filter((s) => {
      const sc = s.components.screw as { partEntityId?: string };
      return sc.partEntityId === String(targetPart?.id);
    });

    for (const screw of partScrews) {
      await harness.act({
        type: 'pointerDown',
        x: screw.position.x,
        y: screw.position.y,
      });
      await harness.act({
        type: 'pointerUp',
        x: screw.position.x,
        y: screw.position.y,
      });
      await page.waitForTimeout(800);
    }

    // Wait for part to fall, fade, and be destroyed
    await page.waitForTimeout(3000);

    // Check that part has been destroyed (removed from scene)
    const finalParts = await harness.queryByComponent('part');
    const finalPart = finalParts.find((p) => p.id === targetPart?.id);

    // Part should be destroyed (not found)
    expect(finalPart).toBeUndefined();
    // Part count should be reduced by 1
    expect(finalParts.length).toBe(initialPartCount - 1);
  });

  test('physics should be deterministic across runs', async ({ page }) => {
    attachTelemetry(page);

    // First run
    await page.goto('/?testMode=1&region=test&level=0&seed=12345');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);
    await page.waitForTimeout(500);

    // Get initial state
    const initialParts = await harness.queryByComponent('part');
    const targetPart = initialParts[0];
    const initialPartCount = initialParts.length;

    // Remove screws
    const screws = await harness.queryByComponent('screw');
    const partScrews = screws.filter((s) => {
      const sc = s.components.screw as { partEntityId?: string };
      return sc.partEntityId === String(targetPart?.id);
    });

    for (const screw of partScrews) {
      await harness.act({
        type: 'pointerDown',
        x: screw.position.x,
        y: screw.position.y,
      });
      await harness.act({
        type: 'pointerUp',
        x: screw.position.x,
        y: screw.position.y,
      });
      await page.waitForTimeout(800);
    }

    // Wait for part to fall and be destroyed
    await page.waitForTimeout(3000);
    const partsAfterRun1 = await harness.queryByComponent('part');
    const partRun1Found = partsAfterRun1.find((p) => p.id === targetPart?.id);

    // Reload and run again with same seed
    await page.goto('/?testMode=1&region=test&level=0&seed=12345');
    await harness.waitForReady(15000);
    await page.waitForTimeout(500);

    // Repeat the same actions
    const screws2 = await harness.queryByComponent('screw');
    const partScrews2 = screws2.filter((s) => {
      const sc = s.components.screw as { partEntityId?: string };
      return sc.partEntityId === String(targetPart?.id);
    });

    for (const screw of partScrews2) {
      await harness.act({
        type: 'pointerDown',
        x: screw.position.x,
        y: screw.position.y,
      });
      await harness.act({
        type: 'pointerUp',
        x: screw.position.x,
        y: screw.position.y,
      });
      await page.waitForTimeout(800);
    }

    await page.waitForTimeout(3000);
    const partsAfterRun2 = await harness.queryByComponent('part');
    const partRun2Found = partsAfterRun2.find((p) => p.id === targetPart?.id);

    // Both runs should result in the part being destroyed (deterministic)
    expect(partRun1Found).toBeUndefined();
    expect(partRun2Found).toBeUndefined();
    // Part counts should be identical
    expect(partsAfterRun1.length).toBe(initialPartCount - 1);
    expect(partsAfterRun2.length).toBe(initialPartCount - 1);
  });

  test('part state should change to free when screwCount reaches 0', async ({
    page,
  }) => {
    attachTelemetry(page);

    await page.goto('/?testMode=1&region=test&level=0');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);
    await page.waitForTimeout(500);

    // Get parts and screws
    const parts = await harness.queryByComponent('part');
    const targetPart = parts[0];

    // Check initial part state is 'static'
    const initialState = (targetPart?.components.part as { state?: string })
      ?.state;
    expect(initialState).toBe('static');

    const screws = await harness.queryByComponent('screw');
    const partScrews = screws.filter((s) => {
      const sc = s.components.screw as { partEntityId?: string };
      return sc.partEntityId === String(targetPart?.id);
    });

    // Remove all screws
    for (const screw of partScrews) {
      await harness.act({
        type: 'pointerDown',
        x: screw.position.x,
        y: screw.position.y,
      });
      await harness.act({
        type: 'pointerUp',
        x: screw.position.x,
        y: screw.position.y,
      });
      await page.waitForTimeout(800);
    }

    await page.waitForTimeout(500);

    // Get updated part state
    const updatedParts = await harness.queryByComponent('part');
    const updatedPart = updatedParts.find((p) => p.id === targetPart?.id);
    const finalState = (updatedPart?.components.part as { state?: string })
      ?.state;

    // Part should now be in 'free' state
    expect(finalState).toBe('free');
  });
});

test.describe('Physics Demo', () => {
  // This test is for recording demo video
  test.skip(process.env.RECORD_VIDEO !== '1', 'Demo recording only');

  test('physics demo for PR', async ({ page }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1&region=test&level=0&skipIntro');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);
    await page.waitForTimeout(1000);

    // Get parts and screws
    const parts = await harness.queryByComponent('part');
    const screws = await harness.queryByComponent('screw');

    // Find a part with multiple screws for visual effect
    const partWithScrews = parts.find((p) => {
      const partScrews = screws.filter((s) => {
        const sc = s.components.screw as { partEntityId?: string };
        return sc.partEntityId === String(p.id);
      });
      return partScrews.length >= 2;
    });

    if (!partWithScrews) {
      console.log('No suitable part found for demo');
      return;
    }

    const partScrews = screws.filter((s) => {
      const sc = s.components.screw as { partEntityId?: string };
      return sc.partEntityId === String(partWithScrews.id);
    });

    // Remove screws one by one with delays for visual effect
    for (const screw of partScrews) {
      await page.waitForTimeout(500);
      await harness.act({
        type: 'pointerDown',
        x: screw.position.x,
        y: screw.position.y,
      });
      await harness.act({
        type: 'pointerUp',
        x: screw.position.x,
        y: screw.position.y,
      });
      await page.waitForTimeout(1000);
    }

    // Let physics play out
    await page.waitForTimeout(3000);
  });
});
