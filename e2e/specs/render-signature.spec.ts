import { test, expect } from '@playwright/test';
import { withHarness } from '../helpers/harness';
import { attachTelemetry, printTelemetry } from '../helpers/telemetry';
import {
  expectEntityCount,
  expectSignatureStable,
  expectSignatureChanged,
  expectSceneState,
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
  });

  test('produces stable signature for paused scene', async ({ page }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1');

    const harness = withHarness(page);
    await harness.waitForReady();

    // Pause scene to ensure stability
    await harness.act({ type: 'pause' });

    const sig1 = await harness.getRenderSignature();
    const sig2 = await harness.getRenderSignature();

    // Hashes should be identical when scene state hasn't changed
    expectSignatureStable(sig1, sig2);
  });

  test('signature hash is deterministic', async ({ page }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1');

    const harness = withHarness(page);
    await harness.waitForReady();
    await harness.act({ type: 'pause' });

    const hashes: string[] = [];
    for (let i = 0; i < 5; i++) {
      const sig = await harness.getRenderSignature();
      hashes.push(sig.hash);
    }

    // All hashes should be identical
    const uniqueHashes = new Set(hashes);
    expect(uniqueHashes.size).toBe(1);
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

    // Hashes should be different
    expectSignatureChanged(sig1, sig2);
  });

  test('signature contains entity data', async ({ page }) => {
    const telemetry = attachTelemetry(page);
    await page.goto('/?testMode=1');

    const harness = withHarness(page);
    await harness.waitForReady();

    const signature = await harness.getRenderSignature();
    printTelemetry(telemetry);

    // Should have at least the red square
    expect(signature.entities.length).toBeGreaterThanOrEqual(1);

    // Check entity structure
    const entity = signature.entities[0];
    expect(entity).toHaveProperty('id');
    expect(entity).toHaveProperty('position');
    expect(entity).toHaveProperty('components');
    expect(entity).toHaveProperty('visible');
  });

  test('entities are sorted by ID for determinism', async ({ page }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1');

    const harness = withHarness(page);
    await harness.waitForReady();

    const signature = await harness.getRenderSignature();

    // Check that entities are sorted by ID (IDs may be numeric)
    const ids = signature.entities.map((e) => e.id);
    const sortedIds = [...ids].sort((a, b) => {
      const aStr = typeof a === 'number' ? a.toString() : a;
      const bStr = typeof b === 'number' ? b.toString() : b;
      return aStr.localeCompare(bStr);
    });

    expect(ids).toEqual(sortedIds);
  });

  test('frame counter increments', async ({ page }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1');

    const harness = withHarness(page);
    await harness.waitForReady();

    const sig1 = await harness.getRenderSignature();
    const sig2 = await harness.getRenderSignature();
    const sig3 = await harness.getRenderSignature();

    // Frame counter should increment
    expect(sig2.frame).toBeGreaterThan(sig1.frame);
    expect(sig3.frame).toBeGreaterThan(sig2.frame);
  });

  test('timestamp is recent', async ({ page }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1');

    const harness = withHarness(page);
    await harness.waitForReady();

    const signature = await harness.getRenderSignature();

    // Timestamp should be a recent performance.now() value
    // (this is relative to page load, so we can't compare directly)
    expect(signature.timestamp).toBeGreaterThan(0);
  });

  test('scene state reflects running state', async ({ page }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1');

    const harness = withHarness(page);
    await harness.waitForReady();

    const signature = await harness.getRenderSignature();
    expectSceneState(signature, 'running');
  });

  test('scene state reflects paused state', async ({ page }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1');

    const harness = withHarness(page);
    await harness.waitForReady();
    await harness.act({ type: 'pause' });

    const signature = await harness.getRenderSignature();
    expectSceneState(signature, 'paused');
  });

  test('entity count matches entities array length', async ({ page }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1');

    const harness = withHarness(page);
    await harness.waitForReady();

    const signature = await harness.getRenderSignature();

    expectEntityCount(signature, signature.entities.length);
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
