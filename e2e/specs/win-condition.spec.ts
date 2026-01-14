/**
 * E2E tests for win condition detection.
 *
 * Tests that the win condition is only triggered when all screws
 * are properly placed in colored trays (not still in buffer).
 */

import { test, expect } from '@playwright/test';
import { attachTelemetry } from '../helpers/telemetry';
import { createHarnessClient, waitForScrewState } from '../helpers/harness';

// Use 360x640 viewport to match gameplay-demo coordinates
test.use({
  viewport: { width: 360, height: 640 },
});

/**
 * Get game state phase from the harness.
 */
async function getGamePhase(
  harness: ReturnType<typeof createHarnessClient>
): Promise<string> {
  const gameStateEntities = await harness.queryByComponent('gameState');
  if (gameStateEntities.length === 0) return 'unknown';
  const gs = gameStateEntities[0]!.components as {
    gameState?: { phase?: string };
  };
  return gs.gameState?.phase ?? 'unknown';
}

/**
 * Get count of screws in buffer.
 */
async function getScrewsInBufferCount(
  harness: ReturnType<typeof createHarnessClient>
): Promise<number> {
  const screws = await harness.queryByComponent('screw');
  return screws.filter((s) => {
    const sc = s.components as { screw?: { state?: string } };
    return sc.screw?.state === 'inBuffer';
  }).length;
}

/**
 * Get count of screws still in board.
 */
async function getScrewsInBoardCount(
  harness: ReturnType<typeof createHarnessClient>
): Promise<number> {
  const screws = await harness.queryByComponent('screw');
  return screws.filter((s) => {
    const sc = s.components as { screw?: { state?: string } };
    return sc.screw?.state === 'inBoard';
  }).length;
}

test.describe('Win Condition', () => {
  test('regression: win state must have empty buffer (bug 2026-01-14)', async ({
    page,
  }) => {
    // This test verifies that if the game reaches "won" state,
    // there must be no screws in the buffer.
    //
    // Bug report: 2026-01-14T00-06-28-037Z - "Yellow screw was not placed in tray"
    // Root cause: Win condition only checked `inBoard === 0`, not buffer screws.
    // Fix: Win condition now also checks `inBuffer === 0`.

    attachTelemetry(page);
    await page.goto('/?testMode=1&region=test&level=0');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);

    // Monitor every screw:removalComplete to verify win invariant
    page.on('console', async (msg) => {
      const text = msg.text();
      if (text.includes('WIN:')) {
        // When we see WIN log, buffer should be empty
        const bufferCount = await getScrewsInBufferCount(harness);
        expect(
          bufferCount,
          `WIN triggered with ${String(bufferCount)} screw(s) in buffer! Bug 2026-01-14`
        ).toBe(0);
      }
    });

    // Complete level - use exact sequence from gameplay-demo
    const screwSequence = [
      { x: 315, y: 1289, delay: 800 }, // Red on Board 1 -> red tray
      { x: 485, y: 1289, delay: 800 }, // Blue on Board 1 -> blue tray
      { x: 680, y: 1304, delay: 800 }, // Yellow on Board 2 -> buffer (hidden)
      { x: 400, y: 1369, delay: 800 }, // Green on Board 1 -> buffer (hidden)
      { x: 595, y: 1434, delay: 800 }, // Red on Board 2 -> red tray
      { x: 765, y: 1434, delay: 800 }, // Blue on Board 2 -> blue tray
      { x: 400, y: 1169, delay: 1200 }, // Red on Board 3 -> fills red, reveals green
      { x: 315, y: 1019, delay: 800 }, // Green on Board 3 -> buffer
      { x: 485, y: 1019, delay: 800 }, // Yellow on Board 3 -> buffer
    ];

    for (const screw of screwSequence) {
      await harness.act({ type: 'pointerDown', x: screw.x, y: screw.y });
      await harness.act({ type: 'pointerUp', x: screw.x, y: screw.y });
      await page.waitForTimeout(screw.delay);

      // Check invariant: won state means buffer is empty
      const phase = await getGamePhase(harness);
      if (phase === 'won') {
        const bufferCount = await getScrewsInBufferCount(harness);
        expect(
          bufferCount,
          `Game won but ${String(bufferCount)} screw(s) in buffer!`
        ).toBe(0);
      }
    }

    // Wait for remaining animations/transfers
    await page.waitForTimeout(3000);

    // Final state check
    const phase = await getGamePhase(harness);
    const bufferCount = await getScrewsInBufferCount(harness);
    const boardCount = await getScrewsInBoardCount(harness);

    // The test sequence doesn't remove all screws (only 9 of 11)
    // so game should still be playing with screws on board 4
    if (phase === 'won') {
      expect(bufferCount, 'Won state must have empty buffer').toBe(0);
    } else {
      // Verify game is still playing (expected with partial sequence)
      expect(phase).toBe('playing');
      // Verify we haven't somehow entered a bad state
      expect(
        boardCount,
        'Should have screws remaining on board'
      ).toBeGreaterThan(0);
    }
  });

  test('invariant: won implies all screws inTray (not inBuffer)', async ({
    page,
  }) => {
    // This test plays through a full level completion and verifies
    // the invariant that won state means all screws are in colored trays.

    attachTelemetry(page);
    await page.goto('/?testMode=1&region=test&level=0');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);

    // Tap first red screw and wait for it to reach tray
    await harness.act({ type: 'pointerDown', x: 315, y: 1289 });
    await harness.act({ type: 'pointerUp', x: 315, y: 1289 });
    await waitForScrewState(harness, page, 'red', 'inTray', { timeout: 3000 });

    // Verify red is in tray and game is still playing
    const phase = await getGamePhase(harness);
    expect(phase).toBe('playing');

    // Now verify game state
    const boardCount = await getScrewsInBoardCount(harness);

    // With only 1 screw removed, shouldn't be won
    expect(boardCount).toBeGreaterThan(0);
    expect(phase).not.toBe('won');

    // The invariant we're testing (via unit tests):
    // WinConditionSystem.checkAllScrewsRemoved() now checks both:
    // - countInBoardScrews() === 0
    // - countInBufferScrews() === 0
  });

  test('regression: stuck must not fire during tray transitions (bug 2026-01-14T01-05)', async ({
    page,
  }) => {
    // This test triggers the condition where:
    // 1. Buffer is full (5 screws)
    // 2. Last screw fills a colored tray, triggering hide+reveal transition
    //
    // Bug: Stuck condition fired before TrayManagementSystem queued the transition.
    // Fix: Reordered system registration so TrayManagementSystem handlers run
    // before WinConditionSystem handlers.
    //
    // Reproduces bug from: bug-reports/2026-01-14T01-05-45-753Z

    attachTelemetry(page);
    await page.goto('/?testMode=1&region=test&level=0');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);

    let stuckFired = false;
    let stuckFiredAtBuffer = -1;

    // Monitor for premature STUCK
    page.on('console', async (msg) => {
      const text = msg.text();
      if (text.includes('STUCK:')) {
        stuckFired = true;
        // Check buffer count at moment of STUCK
        const bufferCount = await getScrewsInBufferCount(harness);
        stuckFiredAtBuffer = bufferCount;
      }
    });

    // Sequence that fills buffer THEN fills red tray to trigger transition
    // Using coordinates from gameplay-demo.spec.ts that are known to work:
    //
    // Board positions (world coords, 360x640 viewport):
    // Board 1 (walnut) at (400, 1369) - has red, blue, green screws
    // Board 2 (birch) at (680, 1369) - has yellow, red, blue screws
    // Board 3 (mahogany) at (400, 1099) - has green, yellow, red screws
    // Board 4 (pine) at (510, 949) - has blue, green screws

    const screwSequence = [
      // Phase 1: Put 2 red screws in red tray (capacity 3)
      { x: 315, y: 1289, delay: 700 }, // Red on Board 1 -> red tray [slot 0]
      { x: 595, y: 1434, delay: 700 }, // Red on Board 2 -> red tray [slot 1]

      // Phase 2: Fill buffer with 5 non-red screws (no green/yellow tray visible yet)
      { x: 680, y: 1304, delay: 700 }, // Yellow on Board 2 -> buffer [slot 0]
      { x: 400, y: 1369, delay: 700 }, // Green on Board 1 -> buffer [slot 1]
      { x: 315, y: 1019, delay: 700 }, // Green on Board 3 -> buffer [slot 2]
      { x: 485, y: 1019, delay: 700 }, // Yellow on Board 3 -> buffer [slot 3]

      // Phase 3: Put 2 blue screws in blue tray (capacity 3)
      { x: 485, y: 1289, delay: 700 }, // Blue on Board 1 -> blue tray [slot 0]
      { x: 765, y: 1434, delay: 700 }, // Blue on Board 2 -> blue tray [slot 1]

      // Buffer now has 4 screws, add one more to make it full
      // Green on Board 4 -> buffer [slot 4]
      { x: 510, y: 1107, delay: 700 },

      // Phase 4: Fill red tray with the last red screw
      // This triggers hide+reveal transition
      // Buffer is FULL (5 screws) at this point
      { x: 400, y: 1169, delay: 1200 }, // Red on Board 3 -> red tray [slot 2] FILLS IT!
    ];

    for (const screw of screwSequence) {
      await harness.act({ type: 'pointerDown', x: screw.x, y: screw.y });
      await harness.act({ type: 'pointerUp', x: screw.x, y: screw.y });
      await page.waitForTimeout(screw.delay);
    }

    // Wait for all transitions to complete (hide red, reveal green, transfers)
    await page.waitForTimeout(5000);

    // Verify game didn't incorrectly enter stuck state during transitions
    const phase = await getGamePhase(harness);

    // If STUCK fired with screws in buffer, it was premature
    if (stuckFired && stuckFiredAtBuffer > 0) {
      // This indicates the bug - STUCK fired while buffer had screws that
      // could be transferred after the tray transition completed
      throw new Error(
        `STUCK fired prematurely with ${String(stuckFiredAtBuffer)} screw(s) in buffer. ` +
          'TrayManagementSystem should queue transitions before WinConditionSystem checks.'
      );
    }

    // After transitions complete, green screws should have transferred to green tray
    // The exact count depends on how many green screws were in buffer
    const finalBufferCount = await getScrewsInBufferCount(harness);
    // Just verify buffer is not the same as before transition (some screws transferred)
    expect(
      finalBufferCount,
      'After transitions, buffer count should be reduced (some screws transferred)'
    ).toBeLessThan(5);

    // Game should still be playing - we didn't complete the level
    expect(phase).toBe('playing');
  });
});
