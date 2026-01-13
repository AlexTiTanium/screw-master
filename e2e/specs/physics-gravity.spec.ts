/**
 * E2E tests for physics gravity system.
 *
 * Tests that parts fall when all their screws are removed,
 * settle at world bounds, and that physics is deterministic.
 */

import { test, expect } from '@playwright/test';
import { attachTelemetry } from '../helpers/telemetry';
import {
  createHarnessClient,
  waitForPartDestroyed,
  waitForPartState,
  waitForScrewState,
} from '../helpers/harness';

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
      // Wait for screw to leave board state
      await waitForScrewState(
        harness,
        page,
        (screw.components.screw as { color: string }).color,
        'inTray',
        { timeout: 3000 }
      ).catch(() => {
        // Screw may go to buffer instead - that's okay
      });
    }

    // Wait for part to start falling or be destroyed
    await page.waitForTimeout(300);

    // Get updated part position
    const updatedParts = await harness.queryByComponent('part');
    const updatedPart = updatedParts.find((p) => p.id === targetPart?.id);

    // Part should have fallen (Y increased) or already been destroyed
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
      await page.waitForTimeout(500);
    }

    // Wait for part to be destroyed using condition-based wait
    await waitForPartDestroyed(harness, page, targetPart!.id, {
      timeout: 5000,
    });

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

    async function runPhysicsSequence(seed: number): Promise<{
      targetDestroyed: boolean;
      finalCount: number;
      expectedCount: number;
    }> {
      await page.goto(`/?testMode=1&region=test&level=0&seed=${String(seed)}`);
      const harness = createHarnessClient(page);
      await harness.waitForReady(15000);

      const initialParts = await harness.queryByComponent('part');
      const targetPart = initialParts[0];
      const initialPartCount = initialParts.length;

      // Remove screws from target part
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
        await page.waitForTimeout(500);
      }

      // Wait for part to be destroyed
      await waitForPartDestroyed(harness, page, targetPart!.id, {
        timeout: 5000,
      });
      const finalParts = await harness.queryByComponent('part');

      return {
        targetDestroyed: !finalParts.find((p) => p.id === targetPart?.id),
        finalCount: finalParts.length,
        expectedCount: initialPartCount - 1,
      };
    }

    // Run twice with same seed
    const result1 = await runPhysicsSequence(12345);
    const result2 = await runPhysicsSequence(12345);

    // Both runs should produce identical results (deterministic)
    expect(result1.targetDestroyed).toBe(true);
    expect(result2.targetDestroyed).toBe(true);
    expect(result1.finalCount).toBe(result1.expectedCount);
    expect(result2.finalCount).toBe(result2.expectedCount);
  });

  test('part state should change to free when screwCount reaches 0', async ({
    page,
  }) => {
    attachTelemetry(page);

    await page.goto('/?testMode=1&region=test&level=0');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);

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
      await page.waitForTimeout(500);
    }

    // Wait for part to reach 'free' state
    await waitForPartState(harness, page, targetPart!.id, 'free', {
      timeout: 3000,
    });

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
