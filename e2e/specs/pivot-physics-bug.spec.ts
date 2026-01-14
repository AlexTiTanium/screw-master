/**
 * Bug reproduction test for pivot physics issue.
 * Reproduces exact tap sequence from bug-reports/2026-01-14T07-11-35-860Z
 *
 * Bug description: "Square part does not have a physical simulation.
 * the rect part stops rotation in some point"
 */

import { test, expect } from '@playwright/test';
import { attachTelemetry } from '../helpers/telemetry';
import { createHarnessClient } from '../helpers/harness';

// Always record video for this bug reproduction test
test.use({
  video: { mode: 'on', size: { width: 360, height: 640 } },
  viewport: { width: 360, height: 640 },
});

test.describe('Pivot Physics Bug', () => {
  test('reproduce bug from 2026-01-14T07-11-35-860Z report', async ({
    page,
  }) => {
    attachTelemetry(page);
    // Use fixed seed for deterministic physics simulation
    await page.goto('/?testMode=1&region=test&level=0&seed=20260114');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);

    // Wait a moment for the level to fully render
    await page.waitForTimeout(500);

    // Exact tap sequence from console-log.txt:
    // TAP: (360, 949) → blue screw → blue tray [slot 0]
    // TAP: (400, 1369) → green screw → buffer tray [slot 0]
    // TAP: (315, 1289) → red screw → red tray [slot 0]
    // TAP: (595, 1434) → red screw → red tray [slot 1]
    // TAP: (680, 1304) → yellow screw → buffer tray [slot 1]
    // TAP: (765, 1434) → blue screw → blue tray [slot 1]

    const tapSequence = [
      { x: 360, y: 949, desc: 'blue screw → blue tray [slot 0]', delay: 800 },
      {
        x: 400,
        y: 1369,
        desc: 'green screw → buffer tray [slot 0]',
        delay: 800,
      },
      { x: 315, y: 1289, desc: 'red screw → red tray [slot 0]', delay: 800 },
      { x: 595, y: 1434, desc: 'red screw → red tray [slot 1]', delay: 800 },
      {
        x: 680,
        y: 1304,
        desc: 'yellow screw → buffer tray [slot 1]',
        delay: 800,
      },
      { x: 765, y: 1434, desc: 'blue screw → blue tray [slot 1]', delay: 800 },
    ];

    for (const tap of tapSequence) {
      console.log(`TAP: (${String(tap.x)}, ${String(tap.y)}) → ${tap.desc}`);

      // Tap the screw
      await harness.act({ type: 'pointerDown', x: tap.x, y: tap.y });
      await harness.act({ type: 'pointerUp', x: tap.x, y: tap.y });

      // Wait for animation to complete
      await page.waitForTimeout(tap.delay);
    }

    // Wait extra time to observe physics behavior (parts should be swinging/simulating)
    // Need extra time for all animations and physics to settle
    await page.waitForTimeout(5000);

    // Capture game state for comparison with bug report
    const entities = await harness.getEntities();

    // =====================================================================
    // BUG 1: Pine horizontal part (reddish-brown) stops at ~45° angle limit
    // Expected: Should swing down to ~90° (pointing straight down)
    // =====================================================================
    const pinePart = entities.find(
      (e) =>
        (e.components?.part as { partDefinitionId?: string } | undefined)
          ?.partDefinitionId === 'board-pine-horizontal'
    );
    expect(pinePart).toBeDefined();

    const pineRotation = pinePart!.rotation;
    const pineRotationDegrees = (pineRotation * 180) / Math.PI;
    console.log(
      `Pine part rotation: ${pineRotation.toFixed(4)} rad (${pineRotationDegrees.toFixed(1)}°)`
    );

    // BUG: Part stops at ~45° due to angle limit, should swing to ~90°
    // This assertion will FAIL with current bug (rotation is ~-45° instead of ~-90°)
    expect(
      Math.abs(pineRotationDegrees),
      `Pine part should rotate to ~90° but stopped at ${pineRotationDegrees.toFixed(1)}°`
    ).toBeGreaterThan(80);

    // =====================================================================
    // BUG 2: Square parts (walnut, birch) don't simulate physics
    // Expected: Pivoting parts should swing from their pivot point (not stay static)
    // =====================================================================

    // Walnut square part - check if it's simulating physics (rotation should change)
    const walnutPart = entities.find(
      (e) =>
        (e.components?.part as { partDefinitionId?: string } | undefined)
          ?.partDefinitionId === 'board-walnut-square'
    );
    expect(walnutPart).toBeDefined();

    const walnutPartComp = walnutPart!.components?.part as {
      state?: string;
      screwCount?: number;
    };
    const walnutPivot = walnutPart!.components?.pivot as {
      isPivoting?: boolean;
      pivotPoint?: { x: number; y: number };
    };
    const walnutPhysics = walnutPart!.components?.physicsBody as {
      bodyType?: string;
      bodyId?: number;
      isSleeping?: boolean;
    };
    const walnutState = walnutPartComp?.state;
    const walnutRotation = walnutPart!.rotation;
    const walnutRotationDegrees = (walnutRotation * 180) / Math.PI;
    console.log(
      `Walnut part: state=${String(walnutState)}, rotation=${walnutRotation.toFixed(4)} rad (${walnutRotationDegrees.toFixed(1)}°)`
    );
    console.log(
      `Walnut pivot: isPivoting=${String(walnutPivot?.isPivoting)}, pivotPoint=(${String(walnutPivot?.pivotPoint?.x)}, ${String(walnutPivot?.pivotPoint?.y)})`
    );
    console.log(
      `Walnut physics: bodyType=${String(walnutPhysics?.bodyType)}, bodyId=${String(walnutPhysics?.bodyId)}, isSleeping=${String(walnutPhysics?.isSleeping)}`
    );
    console.log(
      `Walnut position: (${String(walnutPart!.position.x)}, ${String(walnutPart!.position.y)})`
    );

    // BUG: Walnut part has rotation=0 (no physics), should have some rotation from pivot
    // With gravity pulling down, any pivoting part should rotate toward vertical
    // This assertion will FAIL if physics isn't simulating
    expect(
      Math.abs(walnutRotationDegrees),
      `Walnut part (pivoting) should have rotated but rotation=${walnutRotationDegrees.toFixed(1)}°`
    ).toBeGreaterThan(5);

    // Birch square part - check physics simulation status
    // NOTE: With unlimited rotation, pine may collide with birch and knock it off-screen.
    // This is valid physics behavior - if birch is gone, physics is working!
    const birchPart = entities.find(
      (e) =>
        (e.components?.part as { partDefinitionId?: string } | undefined)
          ?.partDefinitionId === 'board-birch-square'
    );

    if (birchPart) {
      const birchPartComp = birchPart.components?.part as {
        state?: string;
        screwCount?: number;
      };
      const birchState = birchPartComp?.state;
      const birchPhysics = birchPart.components?.physicsBody as {
        bodyType?: string;
        isSleeping?: boolean;
      };
      console.log(
        `Birch part: state=${String(birchState)}, bodyType=${String(birchPhysics?.bodyType)}`
      );

      // Verify physics body is properly set to dynamic for interactive states
      if (birchState === 'pivoting' || birchState === 'loosened') {
        expect(
          birchPhysics?.bodyType,
          `Birch part in ${birchState} state should have dynamic physics`
        ).toBe('dynamic');
      }
    } else {
      // Birch was knocked off by pine swing - physics is working correctly!
      console.log(
        'Birch part: knocked off-screen by collision (physics working!)'
      );
    }

    // Take a screenshot for comparison
    await page.screenshot({
      path: 'e2e/screenshots/pivot-physics-bug-reproduction.png',
    });
  });
});
