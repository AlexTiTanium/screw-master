import { test, expect } from '@playwright/test';
import { withHarness } from '../helpers/harness';
import { attachTelemetry } from '../helpers/telemetry';

test.describe('TestScene - Color Toggle', () => {
  test('clicking interactive square toggles color from red to green', async ({
    page,
  }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1');

    const harness = withHarness(page);
    await harness.waitForReady();

    // Get the square entity with testSquare component
    const squares = await harness.queryByComponent('testSquare');
    // Filter to find the non-rotating square (the one without rotation component)
    const interactiveSquares = squares.filter(
      (s) => !('rotation' in s.components)
    );
    expect(interactiveSquares.length).toBe(1);

    const square = interactiveSquares[0]!;

    // Verify initial color is red (0xff0000 = 16711680)
    const initialColor = (square.components.testSquare as { color: number })
      .color;
    expect(initialColor).toBe(0xff0000);

    // Calculate square center position
    // Square is at (1080/2 - 50, 1920/2 - 50) = (490, 910) with size 100
    // Center is at (490 + 50, 910 + 50) = (540, 960)
    const squareCenterX = 540;
    const squareCenterY = 960;

    // Click on the square (pointer down + up)
    await harness.actMany([
      { type: 'pointerDown', x: squareCenterX, y: squareCenterY, button: 0 },
      { type: 'pointerUp', x: squareCenterX, y: squareCenterY, button: 0 },
      { type: 'wait', ms: 50 }, // Wait for the click to be processed
    ]);

    // Get updated square entity
    const updatedSquares = await harness.queryByComponent('testSquare');
    const updatedInteractiveSquares = updatedSquares.filter(
      (s) => !('rotation' in s.components)
    );
    const updatedSquare = updatedInteractiveSquares[0]!;

    // Verify color changed to green (0x00ff00 = 65280)
    const newColor = (updatedSquare.components.testSquare as { color: number })
      .color;
    expect(newColor).toBe(0x00ff00);
  });

  test('clicking interactive square twice toggles color back to red', async ({
    page,
  }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1');

    const harness = withHarness(page);
    await harness.waitForReady();

    const squareCenterX = 540;
    const squareCenterY = 960;

    // First click - red to green
    await harness.actMany([
      { type: 'pointerDown', x: squareCenterX, y: squareCenterY, button: 0 },
      { type: 'pointerUp', x: squareCenterX, y: squareCenterY, button: 0 },
      { type: 'wait', ms: 50 },
    ]);

    // Verify green
    let squares = await harness.queryByComponent('testSquare');
    let interactiveSquare = squares.find((s) => !('rotation' in s.components))!;
    expect(
      (interactiveSquare.components.testSquare as { color: number }).color
    ).toBe(0x00ff00);

    // Second click - green to red
    await harness.actMany([
      { type: 'pointerDown', x: squareCenterX, y: squareCenterY, button: 0 },
      { type: 'pointerUp', x: squareCenterX, y: squareCenterY, button: 0 },
      { type: 'wait', ms: 50 },
    ]);

    // Verify red again
    squares = await harness.queryByComponent('testSquare');
    interactiveSquare = squares.find((s) => !('rotation' in s.components))!;
    expect(
      (interactiveSquare.components.testSquare as { color: number }).color
    ).toBe(0xff0000);
  });
});

test.describe('TestScene - Rotation', () => {
  test('rotating square has rotation component', async ({ page }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1');

    const harness = withHarness(page);
    await harness.waitForReady();

    // Query entities with rotation component
    const rotatingEntities = await harness.queryByComponent('rotation');
    expect(rotatingEntities.length).toBe(1);

    const rotatingSquare = rotatingEntities[0]!;

    // Verify it has the rotation component with speed
    const rotationComponent = rotatingSquare.components.rotation as {
      speed: number;
    };
    expect(rotationComponent).toBeDefined();
    expect(rotationComponent.speed).toBe(Math.PI / 1000); // Radians per millisecond
  });

  test('rotating square rotation changes over time', async ({ page }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1');

    const harness = withHarness(page);
    await harness.waitForReady();

    // Get initial rotation
    const initialEntities = await harness.queryByComponent('rotation');
    expect(initialEntities.length).toBe(1);
    const initialRotation = initialEntities[0]!.rotation;

    // Wait for some time to let the square rotate
    await harness.act({ type: 'wait', ms: 500 });

    // Get rotation after waiting
    const updatedEntities = await harness.queryByComponent('rotation');
    const updatedRotation = updatedEntities[0]!.rotation;

    // Rotation should have increased (or wrapped around)
    // With speed of PI/2 rad/s, after 500ms we expect ~PI/4 radians of rotation
    // We just verify rotation changed
    expect(updatedRotation).not.toBe(initialRotation);
  });

  test('rotation is continuous over multiple intervals', async ({ page }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1');

    const harness = withHarness(page);
    await harness.waitForReady();

    // Get rotation at t1
    const entities1 = await harness.queryByComponent('rotation');
    const rotation1 = entities1[0]!.rotation;

    // Wait
    await harness.act({ type: 'wait', ms: 200 });

    // Get rotation at t2
    const entities2 = await harness.queryByComponent('rotation');
    const rotation2 = entities2[0]!.rotation;

    // Wait again
    await harness.act({ type: 'wait', ms: 200 });

    // Get rotation at t3
    const entities3 = await harness.queryByComponent('rotation');
    const rotation3 = entities3[0]!.rotation;

    // Verify rotation keeps increasing (accounting for possible wrap-around)
    // The rotation should be different at each measurement
    expect(rotation2).not.toBe(rotation1);
    expect(rotation3).not.toBe(rotation2);
  });
});

test.describe('TestScene - Entity Setup', () => {
  test('scene has both interactive and rotating squares', async ({ page }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1');

    const harness = withHarness(page);
    await harness.waitForReady();

    // Get all entities with testSquare component
    const allSquares = await harness.queryByComponent('testSquare');

    // Should have 2 squares (interactive + rotating)
    expect(allSquares.length).toBe(2);

    // One should have rotation component, one should not
    const withRotation = allSquares.filter((s) => 'rotation' in s.components);
    const withoutRotation = allSquares.filter(
      (s) => !('rotation' in s.components)
    );

    expect(withRotation.length).toBe(1);
    expect(withoutRotation.length).toBe(1);
  });

  test('rotating square is positioned to the right of interactive square', async ({
    page,
  }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1');

    const harness = withHarness(page);
    await harness.waitForReady();

    const allSquares = await harness.queryByComponent('testSquare');

    const rotatingSquare = allSquares.find((s) => 'rotation' in s.components)!;
    const interactiveSquare = allSquares.find(
      (s) => !('rotation' in s.components)
    )!;

    // Rotating square should be to the right of interactive square
    expect(rotatingSquare.position.x).toBeGreaterThan(
      interactiveSquare.position.x
    );
  });
});
