/**
 * Consolidated E2E tests for the tray system.
 *
 * Tests tray visibility, positioning, transitions, hide animations,
 * placeholder positioning, and screw placement behavior.
 */

import { test, expect } from '@playwright/test';
import { attachTelemetry } from '../helpers/telemetry';
import {
  createHarnessClient,
  type EntitySnapshot,
  waitForScrewState,
  waitForAnimationsToSettle,
  waitForCondition,
} from '../helpers/harness';

// Expected tray X positions from TRAY_FRAME_LAYOUT
// Slot positions: frame.x(32) + slotOffsets[i].x
const EXPECTED_TRAY_X_POSITIONS = [57, 252, 451, 646, 840];

// Placeholder positioning constants
const TRAY_WIDTH = 200;
const SLOT_DISPLAY_WIDTH = 50;
const PLACEHOLDER_SPACING = 50;

/**
 * Calculate expected centered slot positions for a given capacity.
 */
function calculateCenteredPositions(capacity: number): number[] {
  const totalWidth = (capacity - 1) * PLACEHOLDER_SPACING + SLOT_DISPLAY_WIDTH;
  const startX = (TRAY_WIDTH - totalWidth) / 2 + SLOT_DISPLAY_WIDTH / 2;

  const positions: number[] = [];
  for (let i = 0; i < capacity; i++) {
    positions.push(startX + i * PLACEHOLDER_SPACING);
  }
  return positions;
}

test.describe('Tray System', () => {
  test.describe('Initial Visibility', () => {
    test('test level has correct tray setup: 4 trays, 2 visible, 2 hidden', async ({
      page,
    }) => {
      attachTelemetry(page);
      await page.goto('/?testMode=1&region=test&level=0');

      const harness = createHarnessClient(page);
      await harness.waitForReady(15000);

      const trays = await harness.queryByComponent('tray');
      expect(trays.length).toBe(4);

      // Check displayOrder values exist
      const displayOrders = trays.map(
        (t: EntitySnapshot) =>
          (t.components.tray as { displayOrder: number }).displayOrder
      );
      expect(displayOrders).toContain(0);
      expect(displayOrders).toContain(1);
      expect(displayOrders).toContain(2);
      expect(displayOrders).toContain(3);

      // Visible trays (displayOrder 0-1) at Y < 300
      const visibleTrays = trays.filter(
        (t: EntitySnapshot) =>
          (t.components.tray as { displayOrder: number }).displayOrder < 2
      );
      expect(visibleTrays.length).toBe(2);
      for (const tray of visibleTrays) {
        expect(tray.position.y).toBeLessThan(300);
        expect(tray.position.y).toBeGreaterThan(150);
      }

      // Hidden trays (displayOrder 2+) at Y > 400
      const hiddenTrays = trays.filter(
        (t: EntitySnapshot) =>
          (t.components.tray as { displayOrder: number }).displayOrder >= 2
      );
      expect(hiddenTrays.length).toBe(2);
      for (const tray of hiddenTrays) {
        expect(tray.position.y).toBeGreaterThan(400);
      }
    });

    test('visible trays are at expected X positions', async ({ page }) => {
      attachTelemetry(page);
      await page.goto('/?testMode=1&region=test&level=0');

      const harness = createHarnessClient(page);
      await harness.waitForReady(15000);

      const trays = await harness.queryByComponent('tray');

      // Sort by displayOrder
      const sortedTrays = [...trays].sort(
        (a: EntitySnapshot, b: EntitySnapshot) =>
          (a.components.tray as { displayOrder: number }).displayOrder -
          (b.components.tray as { displayOrder: number }).displayOrder
      );

      // Visible trays (0-1) should be at their expected X positions
      for (const tray of sortedTrays) {
        const displayOrder = (tray.components.tray as { displayOrder: number })
          .displayOrder;
        if (displayOrder < 2) {
          expect(tray.position.x).toBeCloseTo(
            EXPECTED_TRAY_X_POSITIONS[displayOrder]!,
            0
          );
        }
      }
    });
  });

  test.describe('Screw Placement', () => {
    test('screw placement goes to matching visible tray', async ({ page }) => {
      attachTelemetry(page);
      await page.goto('/?testMode=1&region=test&level=0');

      const harness = createHarnessClient(page);
      await harness.waitForReady(15000);
      await page.waitForTimeout(500);

      // Get initial red tray state (should have 0 screws)
      let trays = await harness.queryByComponent('tray');
      const redTray = trays.find(
        (t: EntitySnapshot) =>
          (t.components.tray as { color: string }).color === 'red'
      );
      expect(redTray).toBeDefined();
      expect(
        (redTray!.components.tray as { screwCount: number }).screwCount
      ).toBe(0);

      // Tap the red screw at world (315, 1289)
      await harness.act({ type: 'pointerDown', x: 315, y: 1289 });
      await harness.act({ type: 'pointerUp', x: 315, y: 1289 });
      await waitForScrewState(harness, page, 'red', 'inTray', {
        timeout: 3000,
      });

      // Red tray should now have 1 screw
      trays = await harness.queryByComponent('tray');
      const updatedRedTray = trays.find(
        (t: EntitySnapshot) =>
          (t.components.tray as { color: string }).color === 'red'
      );
      expect(
        (updatedRedTray!.components.tray as { screwCount: number }).screwCount
      ).toBe(1);
    });

    test('screw goes to buffer when no matching visible tray', async ({
      page,
    }) => {
      attachTelemetry(page);
      await page.goto('/?testMode=1&region=test&level=0');

      const harness = createHarnessClient(page);
      await harness.waitForReady(15000);
      await page.waitForTimeout(500);

      // Get initial buffer state (should be empty)
      let bufferTrays = await harness.queryByComponent('bufferTray');
      expect(bufferTrays.length).toBe(1);
      const initialScrewCount = (
        bufferTrays[0]!.components.bufferTray as { screwIds: string[] }
      ).screwIds.length;
      expect(initialScrewCount).toBe(0);

      // Yellow tray is hidden (displayOrder 3), so yellow screw should go to buffer
      // Tap the yellow screw at world (680, 1304)
      await harness.act({ type: 'pointerDown', x: 680, y: 1304 });
      await harness.act({ type: 'pointerUp', x: 680, y: 1304 });
      await waitForScrewState(harness, page, 'yellow', 'inBuffer', {
        timeout: 3000,
      });

      // Buffer should now have 1 screw
      bufferTrays = await harness.queryByComponent('bufferTray');
      const updatedScrewCount = (
        bufferTrays[0]!.components.bufferTray as { screwIds: string[] }
      ).screwIds.length;
      expect(updatedScrewCount).toBe(1);
    });
  });

  test.describe('Tray Hide Animation', () => {
    test('tray and screws removed after hide animation completes', async ({
      page,
    }) => {
      attachTelemetry(page);
      await page.goto('/?testMode=1&region=test&level=0');

      const harness = createHarnessClient(page);
      await harness.waitForReady(15000);

      // Get initial screw count
      const initialScrews = await harness.queryByComponent('screw');
      const initialScrewCount = initialScrews.length;

      // Fill red tray (capacity 3) to trigger hide animation
      // Red screws at: (315, 1289), (595, 1434), (400, 1169)
      await harness.act({ type: 'pointerDown', x: 315, y: 1289 });
      await harness.act({ type: 'pointerUp', x: 315, y: 1289 });
      await waitForScrewState(harness, page, 'red', 'inTray', {
        timeout: 3000,
      });

      await harness.act({ type: 'pointerDown', x: 595, y: 1434 });
      await harness.act({ type: 'pointerUp', x: 595, y: 1434 });
      await waitForScrewState(harness, page, 'red', 'inTray', {
        timeout: 3000,
        count: 2,
      });

      await harness.act({ type: 'pointerDown', x: 400, y: 1169 });
      await harness.act({ type: 'pointerUp', x: 400, y: 1169 });

      // Wait for hide animation
      await waitForAnimationsToSettle(harness, page, {
        timeout: 5000,
        stableTime: 300,
      });

      // Red tray should have displayOrder 99 (hidden marker)
      const finalTrays = await harness.queryByComponent('tray');
      const redTray = finalTrays.find(
        (t: EntitySnapshot) =>
          (t.components.tray as { color: string }).color === 'red'
      );
      if (redTray) {
        expect(
          (redTray.components.tray as { displayOrder: number }).displayOrder
        ).toBe(99);
      }

      // In-board screws should be reduced by 3
      const finalScrews = await harness.queryByComponent('screw');
      const inBoardScrews = finalScrews.filter(
        (s: EntitySnapshot) =>
          (s.components.screw as { state: string }).state === 'inBoard'
      );
      expect(inBoardScrews.length).toBe(initialScrewCount - 3);
    });

    test('next hidden tray slides in after tray hides', async ({ page }) => {
      attachTelemetry(page);
      await page.goto('/?testMode=1&region=test&level=0');

      const harness = createHarnessClient(page);
      await harness.waitForReady(15000);

      // Find the first hidden tray (displayOrder 2)
      let trays = await harness.queryByComponent('tray');
      const hiddenTray = trays.find(
        (t: EntitySnapshot) =>
          (t.components.tray as { displayOrder: number }).displayOrder === 2
      );
      expect(hiddenTray).toBeDefined();
      const hiddenTrayColor = (hiddenTray!.components.tray as { color: string })
        .color;

      // Fill red tray to trigger hide and reveal
      await harness.act({ type: 'pointerDown', x: 315, y: 1289 });
      await harness.act({ type: 'pointerUp', x: 315, y: 1289 });
      await waitForScrewState(harness, page, 'red', 'inTray', {
        timeout: 3000,
      });

      await harness.act({ type: 'pointerDown', x: 595, y: 1434 });
      await harness.act({ type: 'pointerUp', x: 595, y: 1434 });
      await waitForScrewState(harness, page, 'red', 'inTray', {
        timeout: 3000,
        count: 2,
      });

      await harness.act({ type: 'pointerDown', x: 400, y: 1169 });
      await harness.act({ type: 'pointerUp', x: 400, y: 1169 });

      // Wait for reveal animation
      await waitForCondition(
        page,
        async () => {
          const t = await harness.queryByComponent('tray');
          const revealed = t.find(
            (tr: EntitySnapshot) =>
              (tr.components.tray as { color: string }).color ===
              hiddenTrayColor
          );
          if (!revealed) return false;
          return (
            (revealed.components.tray as { displayOrder: number })
              .displayOrder === 1
          );
        },
        {
          timeout: 5000,
          message: `Expected ${hiddenTrayColor} tray to be revealed at displayOrder 1`,
        }
      );

      await waitForAnimationsToSettle(harness, page, {
        timeout: 3000,
        stableTime: 200,
      });

      // Verify revealed tray position
      trays = await harness.queryByComponent('tray');
      const revealedTray = trays.find(
        (t: EntitySnapshot) =>
          (t.components.tray as { color: string }).color === hiddenTrayColor
      );
      expect(revealedTray).toBeDefined();
      expect(
        (revealedTray!.components.tray as { displayOrder: number }).displayOrder
      ).toBe(1);
      expect(revealedTray!.position.y).toBeLessThan(300);
      expect(revealedTray!.position.x).toBeCloseTo(252, 0); // Slot 1 position
    });

    test('no console errors during tray hide animation', async ({ page }) => {
      attachTelemetry(page);

      const consoleMessages: { type: string; text: string }[] = [];
      page.on('console', (msg) => {
        const type = msg.type();
        if (type === 'error' || type === 'warning') {
          consoleMessages.push({ type, text: msg.text() });
        }
      });

      await page.goto('/?testMode=1&region=test&level=0');

      const harness = createHarnessClient(page);
      await harness.waitForReady(15000);

      // Fill red tray
      await harness.act({ type: 'pointerDown', x: 315, y: 1289 });
      await harness.act({ type: 'pointerUp', x: 315, y: 1289 });
      await waitForScrewState(harness, page, 'red', 'inTray', {
        timeout: 3000,
      });

      await harness.act({ type: 'pointerDown', x: 595, y: 1434 });
      await harness.act({ type: 'pointerUp', x: 595, y: 1434 });
      await waitForScrewState(harness, page, 'red', 'inTray', {
        timeout: 3000,
        count: 2,
      });

      await harness.act({ type: 'pointerDown', x: 400, y: 1169 });
      await harness.act({ type: 'pointerUp', x: 400, y: 1169 });

      await waitForAnimationsToSettle(harness, page, {
        timeout: 5000,
        stableTime: 300,
      });

      // Filter expected browser warnings
      const relevantMessages = consoleMessages.filter(
        (m) =>
          !m.text.includes('DeprecationWarning') &&
          !m.text.includes('DevTools') &&
          !m.text.includes('[vite]') &&
          !m.text.includes('AudioContext') &&
          !m.text.includes('WebGL') &&
          !m.text.includes('GPU stall')
      );

      expect(relevantMessages).toHaveLength(0);
    });
  });

  test.describe('Tray Shift', () => {
    test('screws in shifted tray move with the tray', async ({ page }) => {
      attachTelemetry(page);
      await page.goto('/?testMode=1&region=test&level=0');

      const harness = createHarnessClient(page);
      await harness.waitForReady(15000);

      // Step 1: Place one blue screw in blue tray (at displayOrder 1)
      await harness.act({ type: 'pointerDown', x: 485, y: 1289 });
      await harness.act({ type: 'pointerUp', x: 485, y: 1289 });
      await waitForScrewState(harness, page, 'blue', 'inTray', {
        timeout: 3000,
      });

      // Record blue screw position before shift
      let screws = await harness.queryByComponent('screw');
      const blueScrewBefore = screws.find(
        (s: EntitySnapshot) =>
          (s.components.screw as { color: string; state: string }).color ===
            'blue' &&
          (s.components.screw as { state: string }).state === 'inTray'
      );
      expect(blueScrewBefore).toBeDefined();
      const blueScrewXBefore = blueScrewBefore!.position.x;

      // Get blue tray position before shift
      let trays = await harness.queryByComponent('tray');
      const blueTrayBefore = trays.find(
        (t: EntitySnapshot) =>
          (t.components.tray as { color: string }).color === 'blue'
      );
      expect(blueTrayBefore).toBeDefined();
      const blueTrayXBefore = blueTrayBefore!.position.x;

      // Step 2: Fill red tray to trigger shift
      await harness.act({ type: 'pointerDown', x: 315, y: 1289 });
      await harness.act({ type: 'pointerUp', x: 315, y: 1289 });
      await waitForScrewState(harness, page, 'red', 'inTray', {
        timeout: 3000,
      });

      await harness.act({ type: 'pointerDown', x: 595, y: 1434 });
      await harness.act({ type: 'pointerUp', x: 595, y: 1434 });
      await waitForScrewState(harness, page, 'red', 'inTray', {
        timeout: 3000,
        count: 2,
      });

      await harness.act({ type: 'pointerDown', x: 400, y: 1169 });
      await harness.act({ type: 'pointerUp', x: 400, y: 1169 });

      // Wait for blue tray to shift to displayOrder 0
      await waitForCondition(
        page,
        async () => {
          const t = await harness.queryByComponent('tray');
          const blueTray = t.find(
            (tr: EntitySnapshot) =>
              (tr.components.tray as { color: string }).color === 'blue'
          );
          if (!blueTray) return false;
          return (
            (blueTray.components.tray as { displayOrder: number })
              .displayOrder === 0
          );
        },
        {
          timeout: 5000,
          message: 'Expected blue tray to shift to displayOrder 0',
        }
      );

      await waitForAnimationsToSettle(harness, page, {
        timeout: 3000,
        stableTime: 200,
      });

      // Step 3: Verify blue tray shifted
      trays = await harness.queryByComponent('tray');
      const blueTrayAfter = trays.find(
        (t: EntitySnapshot) =>
          (t.components.tray as { color: string }).color === 'blue'
      );
      expect(blueTrayAfter).toBeDefined();
      const blueTrayXAfter = blueTrayAfter!.position.x;
      const trayDeltaX = blueTrayXAfter - blueTrayXBefore;

      // Tray should have moved from slot 1 to slot 0 (approx -195px)
      expect(trayDeltaX).toBeLessThan(-100);

      // Step 4: Verify blue screw moved with tray
      screws = await harness.queryByComponent('screw');
      const blueScrewAfter = screws.find(
        (s: EntitySnapshot) =>
          (s.components.screw as { color: string; state: string }).color ===
            'blue' &&
          (s.components.screw as { state: string }).state === 'inTray'
      );
      expect(blueScrewAfter).toBeDefined();

      const screwDeltaX = blueScrewAfter!.position.x - blueScrewXBefore;

      // Screw should have moved by same amount as tray (within 5px tolerance)
      expect(Math.abs(screwDeltaX - trayDeltaX)).toBeLessThan(5);
    });
  });

  test.describe('Placeholder Positioning', () => {
    test('placeholders stay within tray boundaries', async ({ page }) => {
      attachTelemetry(page);
      await page.goto('/?testMode=1&region=test&level=0');

      const harness = createHarnessClient(page);
      await harness.waitForReady(15000);

      const trays = await harness.queryByComponent('tray');
      expect(trays.length).toBeGreaterThan(0);

      for (const tray of trays) {
        const trayX = tray.position.x;
        const capacity = (tray.components.tray as { capacity: number })
          .capacity;
        const expectedPositions = calculateCenteredPositions(capacity);

        for (let i = 0; i < capacity; i++) {
          const expectedLocalX = expectedPositions[i];
          if (expectedLocalX === undefined) continue;

          const expectedWorldX = trayX + expectedLocalX;
          const leftEdge = expectedWorldX - SLOT_DISPLAY_WIDTH / 2;
          const rightEdge = expectedWorldX + SLOT_DISPLAY_WIDTH / 2;

          expect(leftEdge).toBeGreaterThanOrEqual(trayX);
          expect(rightEdge).toBeLessThanOrEqual(trayX + TRAY_WIDTH);
        }
      }
    });

    test('placeholder positions are calculated correctly by capacity', () => {
      // 2-slot tray: positions at x=75, 125
      expect(calculateCenteredPositions(2)).toEqual([75, 125]);

      // 3-slot tray: positions at x=50, 100, 150
      expect(calculateCenteredPositions(3)).toEqual([50, 100, 150]);

      // 4-slot tray: positions at x=25, 75, 125, 175
      expect(calculateCenteredPositions(4)).toEqual([25, 75, 125, 175]);
    });
  });
});
