import { test, expect } from '@playwright/test';
import { withHarness } from '../helpers/harness';
import { attachTelemetry, printTelemetry } from '../helpers/telemetry';
import {
  expectSignatureChanged,
  expectSceneState,
} from '../helpers/assertions';

test.describe('Action DSL', () => {
  test('can move entity via setPosition', async ({ page }) => {
    const telemetry = attachTelemetry(page);
    await page.goto('/?testMode=1');

    const harness = withHarness(page);
    await harness.waitForReady();

    // Get initial state - find the interactive square (without rotation component)
    const sig1 = await harness.getRenderSignature();
    const squares = sig1.entities.filter((e) => 'testSquare' in e.components);
    expect(squares.length).toBe(2);

    // Use the interactive square (without rotation component)
    const square = squares.find((e) => !('rotation' in e.components))!;
    expect(square).toBeDefined();
    const entityId = String(square.id);
    const originalPos = square.position;

    // Move entity to new position
    const result = await harness.act({
      type: 'setPosition',
      entityId,
      x: 100,
      y: 100,
    });

    printTelemetry(telemetry);

    expect(result.success).toBe(true);

    // Verify position changed
    const sig2 = await harness.getRenderSignature();
    const movedEntity = sig2.entities.find((e) => String(e.id) === entityId);
    expect(movedEntity).toBeDefined();
    if (movedEntity) {
      expect(movedEntity.position.x).toBe(100);
      expect(movedEntity.position.y).toBe(100);
      expect(movedEntity.position.x).not.toBe(originalPos.x);
    }
    expectSignatureChanged(sig1, sig2);
  });

  test('can pause and resume scene', async ({ page }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1');

    const harness = withHarness(page);
    await harness.waitForReady();

    // Initial state should be running
    const sig1 = await harness.getRenderSignature();
    expectSceneState(sig1, 'running');

    // Pause scene
    const pauseResult = await harness.act({ type: 'pause' });
    expect(pauseResult.success).toBe(true);

    const sig2 = await harness.getRenderSignature();
    expectSceneState(sig2, 'paused');

    // Resume scene
    const resumeResult = await harness.act({ type: 'resume' });
    expect(resumeResult.success).toBe(true);

    const sig3 = await harness.getRenderSignature();
    expectSceneState(sig3, 'running');
  });

  test('can hide and show entity', async ({ page }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1');

    const harness = withHarness(page);
    await harness.waitForReady();

    // Get entity
    const entities = await harness.getEntities();
    expect(entities.length).toBeGreaterThan(0);
    const firstEntity = entities[0]!;
    const entityId = String(firstEntity.id);

    // Initially visible
    expect(firstEntity.visible).toBe(true);

    // Hide entity
    const hideResult = await harness.act({
      type: 'setVisible',
      entityId,
      visible: false,
    });
    expect(hideResult.success).toBe(true);

    // Verify hidden
    const hiddenEntity = await harness.getEntity(entityId);
    expect(hiddenEntity).not.toBeNull();
    if (hiddenEntity) {
      expect(hiddenEntity.visible).toBe(false);
    }

    // Show entity
    const showResult = await harness.act({
      type: 'setVisible',
      entityId,
      visible: true,
    });
    expect(showResult.success).toBe(true);

    // Verify visible
    const visibleEntity = await harness.getEntity(entityId);
    expect(visibleEntity).not.toBeNull();
    if (visibleEntity) {
      expect(visibleEntity.visible).toBe(true);
    }
  });

  test('can execute action sequence', async ({ page }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1');

    const harness = withHarness(page);
    await harness.waitForReady();

    const entities = await harness.getEntities();
    expect(entities.length).toBeGreaterThan(0);
    const firstEntity = entities[0]!;
    const entityId = String(firstEntity.id);

    // Execute a sequence of actions
    const results = await harness.actMany([
      { type: 'setPosition', entityId, x: 50, y: 50 },
      { type: 'wait', ms: 16 },
      { type: 'setPosition', entityId, x: 200, y: 200 },
    ]);

    // All actions should succeed
    expect(results.every((r) => r.success)).toBe(true);

    // Final position should be the last set position
    const entity = await harness.getEntity(entityId);
    expect(entity).not.toBeNull();
    if (entity) {
      expect(entity.position.x).toBe(200);
      expect(entity.position.y).toBe(200);
    }
  });

  test('reports error for non-existent entity', async ({ page }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1');

    const harness = withHarness(page);
    await harness.waitForReady();

    const result = await harness.act({
      type: 'setPosition',
      entityId: 'non-existent-id',
      x: 100,
      y: 100,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });

  test('can dispatch pointer events', async ({ page }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1');

    const harness = withHarness(page);
    await harness.waitForReady();

    // Dispatch pointer down at center of canvas (1080x1920)
    const downResult = await harness.act({
      type: 'pointerDown',
      x: 540,
      y: 960,
      button: 0,
    });
    expect(downResult.success).toBe(true);

    // Dispatch pointer up
    const upResult = await harness.act({
      type: 'pointerUp',
      x: 540,
      y: 960,
      button: 0,
    });
    expect(upResult.success).toBe(true);
  });

  test('can dispatch keyboard events', async ({ page }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1');

    const harness = withHarness(page);
    await harness.waitForReady();

    // Dispatch key down
    const downResult = await harness.act({
      type: 'keyDown',
      key: 'ArrowRight',
      code: 'ArrowRight',
    });
    expect(downResult.success).toBe(true);

    // Dispatch key up
    const upResult = await harness.act({
      type: 'keyUp',
      key: 'ArrowRight',
      code: 'ArrowRight',
    });
    expect(upResult.success).toBe(true);
  });

  test('can modify component data', async ({ page }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1');

    const harness = withHarness(page);
    await harness.waitForReady();

    // Get entity with testSquare component (use interactive square without rotation)
    const squares = await harness.queryByComponent('testSquare');
    expect(squares.length).toBe(2);
    const square = squares.find((s) => !('rotation' in s.components))!;
    expect(square).toBeDefined();
    const entityId = String(square.id);

    // Modify component data
    const result = await harness.act({
      type: 'setComponent',
      entityId,
      component: 'testSquare',
      data: { size: 200 },
    });
    expect(result.success).toBe(true);

    // Verify component was updated
    const updatedSquares = await harness.queryByComponent('testSquare');
    const updatedSquare = updatedSquares.find(
      (s) => !('rotation' in s.components)
    )!;
    const component = updatedSquare.components.testSquare as {
      size: number;
    };
    expect(component.size).toBe(200);
  });

  test('wait action delays execution', async ({ page }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1');

    const harness = withHarness(page);
    await harness.waitForReady();

    const startTime = Date.now();

    await harness.act({ type: 'wait', ms: 100 });

    const elapsed = Date.now() - startTime;

    // Should have waited at least 100ms (with some tolerance)
    expect(elapsed).toBeGreaterThanOrEqual(90);
  });
});
