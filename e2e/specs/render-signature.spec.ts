/**
 * E2E tests for render signature system.
 *
 * Tests that the render signature API produces consistent,
 * deterministic snapshots of game state for visual regression testing.
 */

import { test, expect } from '@playwright/test';
import { withHarness } from '../helpers/harness';
import { attachTelemetry, printTelemetry } from '../helpers/telemetry';
import {
  expectEntityCount,
  expectSignatureStable,
  expectSignatureChanged,
  expectEntitiesWithComponent,
} from '../helpers/assertions';

test.describe('Render Signature', () => {
  test('produces signature with correct structure', async ({ page }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1');

    const harness = withHarness(page);
    await harness.waitForReady();

    const signature = await harness.getRenderSignature();

    // Check signature structure
    expect(signature).toHaveProperty('timestamp');
    expect(signature).toHaveProperty('frame');
    expect(signature).toHaveProperty('entityCount');
    expect(signature).toHaveProperty('entities');
    expect(signature).toHaveProperty('systems');
    expect(signature).toHaveProperty('sceneState');
    expect(signature).toHaveProperty('hash');

    // Check types
    expect(typeof signature.timestamp).toBe('number');
    expect(typeof signature.frame).toBe('number');
    expect(typeof signature.entityCount).toBe('number');
    expect(Array.isArray(signature.entities)).toBe(true);
    expect(Array.isArray(signature.systems)).toBe(true);
    expect(typeof signature.sceneState).toBe('string');
    expect(typeof signature.hash).toBe('string');

    // Timestamp should be recent (relative to page load)
    expect(signature.timestamp).toBeGreaterThan(0);

    // Entity count matches array
    expectEntityCount(signature, signature.entities.length);
  });

  test('signature hash is stable and deterministic when paused', async ({
    page,
  }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1');

    const harness = withHarness(page);
    await harness.waitForReady();
    await harness.act({ type: 'pause' });

    // Get multiple signatures - all should be identical when paused
    const hashes: string[] = [];
    for (let i = 0; i < 5; i++) {
      const sig = await harness.getRenderSignature();
      hashes.push(sig.hash);
    }

    // All hashes should be identical (deterministic)
    const uniqueHashes = new Set(hashes);
    expect(uniqueHashes.size).toBe(1);

    // Also verify stable assertion helper works
    const sig1 = await harness.getRenderSignature();
    const sig2 = await harness.getRenderSignature();
    expectSignatureStable(sig1, sig2);
  });

  test('signature changes after entity mutation', async ({ page }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1');

    const harness = withHarness(page);
    await harness.waitForReady();

    const sig1 = await harness.getRenderSignature();
    const firstEntity = sig1.entities[0]!;
    const entityId = String(firstEntity.id);

    // Mutate entity position
    await harness.act({
      type: 'setPosition',
      entityId,
      x: 999,
      y: 999,
    });

    const sig2 = await harness.getRenderSignature();
    expectSignatureChanged(sig1, sig2);
  });

  test('signature contains valid entity data', async ({ page }) => {
    const telemetry = attachTelemetry(page);
    await page.goto('/?testMode=1');

    const harness = withHarness(page);
    await harness.waitForReady();

    const signature = await harness.getRenderSignature();
    printTelemetry(telemetry);

    // Should have at least some entities
    expect(signature.entities.length).toBeGreaterThanOrEqual(1);

    // Check entity structure
    const entity = signature.entities[0];
    expect(entity).toHaveProperty('id');
    expect(entity).toHaveProperty('position');
    expect(entity).toHaveProperty('components');
    expect(entity).toHaveProperty('visible');

    // Entities should be sorted by ID for determinism
    const ids = signature.entities.map((e) => e.id);
    const sortedIds = [...ids].sort((a, b) => {
      const aStr = typeof a === 'number' ? a.toString() : a;
      const bStr = typeof b === 'number' ? b.toString() : b;
      return aStr.localeCompare(bStr);
    });
    expect(ids).toEqual(sortedIds);
  });

  test('frame counter increments on running scene', async ({ page }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1');

    const harness = withHarness(page);
    await harness.waitForReady();

    const sig1 = await harness.getRenderSignature();
    const sig2 = await harness.getRenderSignature();
    const sig3 = await harness.getRenderSignature();

    // Frame counter should increment when scene is running
    expect(sig2.frame).toBeGreaterThan(sig1.frame);
    expect(sig3.frame).toBeGreaterThan(sig2.frame);

    // Scene state should be running
    expect(sig1.sceneState).toBe('running');
  });

  test('scene state reflects paused state', async ({ page }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1');

    const harness = withHarness(page);
    await harness.waitForReady();
    await harness.act({ type: 'pause' });

    const signature = await harness.getRenderSignature();
    expect(signature.sceneState).toBe('paused');
  });

  test('can verify specific component entities', async ({ page }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1');

    const harness = withHarness(page);
    await harness.waitForReady();

    const signature = await harness.getRenderSignature();

    // Should have 4 entities with tray component (red, yellow, green, blue)
    const trayEntities = expectEntitiesWithComponent(signature, 'tray', 4);
    expect(trayEntities.length).toBe(4);

    // Find the first tray entity
    const tray = trayEntities[0];
    expect(tray).toBeDefined();

    // Verify the tray's component data
    const trayComponent = tray!.components.tray as {
      capacity: number;
      screwCount: number;
    };
    expect(trayComponent.capacity).toBe(3);
    expect(trayComponent.screwCount).toBe(0);
  });
});
