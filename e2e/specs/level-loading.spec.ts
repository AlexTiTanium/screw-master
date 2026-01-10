/**
 * E2E tests for level loading with free-position screws.
 */

import { test, expect } from '@playwright/test';
import {
  attachTelemetry,
  printTelemetry,
  getErrors,
  getWarnings,
} from '../helpers/telemetry';
import { createHarnessClient } from '../helpers/harness';
import { filterByComponent } from '../helpers/entityFilters';

test.describe('Level Loading - Free Position Screws', () => {
  test('test level loads without errors', async ({ page }) => {
    const telemetry = attachTelemetry(page);

    // Navigate with test region parameter
    await page.goto('/?testMode=1&region=test&level=0');

    // Wait for game to be ready
    await page.waitForFunction(
      () =>
        (window as unknown as { __gameTest?: { ready: boolean } }).__gameTest
          ?.ready === true,
      { timeout: 15000 }
    );

    printTelemetry(telemetry);

    // Check for console/page errors
    const errors = getErrors(telemetry);
    const criticalErrors = errors.filter(
      (e) => !e.includes('Failed to load test image')
    );
    expect(criticalErrors).toHaveLength(0);

    // Check harness errors
    const harness = createHarnessClient(page);
    const harnessErrors = await harness.getErrors();
    expect(harnessErrors).toHaveLength(0);
  });

  test('creates correct number of part entities', async ({ page }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1&region=test&level=0');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);

    const entities = await harness.getEntities();
    const partEntities = filterByComponent(entities, 'part');

    // Test level has 2 boards
    expect(partEntities).toHaveLength(2);
  });

  test('creates correct number of screw entities', async ({ page }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1&region=test&level=0');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);

    const entities = await harness.getEntities();
    const screwEntities = filterByComponent(entities, 'screw');

    // Test level has 6 screws (3 per board)
    expect(screwEntities).toHaveLength(6);
  });

  test('screws have correct colors', async ({ page }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1&region=test&level=0');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);

    const entities = await harness.getEntities();
    const screwEntities = filterByComponent(entities, 'screw');

    // Count screws by color
    const colorCounts = new Map<string, number>();
    for (const screw of screwEntities) {
      const component = screw.components.screw as { color: string };
      const color = component.color;
      colorCounts.set(color, (colorCounts.get(color) ?? 0) + 1);
    }

    // Test level: 2 red, 2 blue, 1 green, 1 yellow
    expect(colorCounts.get('red')).toBe(2);
    expect(colorCounts.get('blue')).toBe(2);
    expect(colorCounts.get('green')).toBe(1);
    expect(colorCounts.get('yellow')).toBe(1);
  });

  test('screws are positioned correctly relative to boards', async ({
    page,
  }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1&region=test&level=0');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);

    const entities = await harness.getEntities();
    const screwEntities = filterByComponent(entities, 'screw');

    // Find the first red screw (should be on first board)
    // First board at (200, 800), first red screw at local (50, 50)
    // Expected world position: (250, 850)
    const redScrews = screwEntities.filter((e) => {
      const component = e.components.screw as { color: string };
      return component.color === 'red';
    });

    expect(redScrews.length).toBeGreaterThanOrEqual(1);

    // Check that one of the red screws is at the expected position
    const expectedPositions = [
      { x: 250, y: 850 }, // Board 1: position (200,800) + screw (50,50)
      { x: 600, y: 995 }, // Board 2: position (550,800) + screw (50,195)
    ];

    const positionMatches = redScrews.filter((screw) => {
      return expectedPositions.some(
        (expected) =>
          Math.abs(screw.position.x - expected.x) < 1 &&
          Math.abs(screw.position.y - expected.y) < 1
      );
    });

    expect(positionMatches.length).toBeGreaterThanOrEqual(1);
  });

  test('part entities have correct layer values', async ({ page }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1&region=test&level=0');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);

    const entities = await harness.getEntities();
    const partEntities = filterByComponent(entities, 'part');

    const layers = partEntities.map((e) => {
      const component = e.components.part as { layer: number };
      return component.layer;
    });

    // Test level: board 1 at layer 1, board 2 at layer 2
    expect(layers.sort((a, b) => a - b)).toEqual([1, 2]);
  });

  test('render signature is stable when paused', async ({ page }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1&region=test&level=0');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);

    // Pause the scene
    await harness.act({ type: 'pause' });

    const sig1 = await harness.getRenderSignature();
    const sig2 = await harness.getRenderSignature();

    expect(sig1.hash).toBe(sig2.hash);
  });

  test('tray entities are created', async ({ page }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1&region=test&level=0');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);

    const entities = await harness.getEntities();
    const trayEntities = filterByComponent(entities, 'tray');

    // Game always has 4 colored trays
    expect(trayEntities).toHaveLength(4);
  });

  test('total entity count is correct', async ({ page }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1&region=test&level=0');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);

    const entities = await harness.getEntities();

    // 4 trays + 2 parts + 6 screws = 12 entities minimum
    // (There may be additional UI entities)
    expect(entities.length).toBeGreaterThanOrEqual(12);
  });

  test('entities persist after multiple frames', async ({ page }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1&region=test&level=0');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);

    // Get initial entity counts
    const initialEntities = await harness.getEntities();
    const initialParts = filterByComponent(initialEntities, 'part');
    const initialScrews = filterByComponent(initialEntities, 'screw');

    expect(initialParts).toHaveLength(2);
    expect(initialScrews).toHaveLength(6);

    // Wait for several frames (500ms)
    await page.waitForTimeout(500);

    // Get entity counts again
    const laterEntities = await harness.getEntities();
    const laterParts = filterByComponent(laterEntities, 'part');
    const laterScrews = filterByComponent(laterEntities, 'screw');

    // Entities should still exist
    expect(laterParts).toHaveLength(2);
    expect(laterScrews).toHaveLength(6);

    // Wait even longer (1 second total)
    await page.waitForTimeout(500);

    // Check again
    const finalEntities = await harness.getEntities();
    const finalParts = filterByComponent(finalEntities, 'part');
    const finalScrews = filterByComponent(finalEntities, 'screw');

    expect(finalParts).toHaveLength(2);
    expect(finalScrews).toHaveLength(6);
  });

  test('entity views are visible in display list', async ({ page }) => {
    attachTelemetry(page);
    await page.goto('/?testMode=1&region=test&level=0');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);

    // Check entity visibility in the scene's view2d stage
    const viewInfo = await page.evaluate(() => {
      const win = window as unknown as {
        __gameTest?: {
          ecs?: {
            getScene?: () => {
              view2d?: {
                stage?: { children?: unknown[] };
                activeItemsContainer?: { children?: unknown[] };
              };
            };
          };
        };
      };
      const scene = win.__gameTest?.ecs?.getScene?.();
      const view2d = scene?.view2d;
      return {
        hasScene: !!scene,
        hasView2d: !!view2d,
        stageChildCount: view2d?.stage?.children?.length ?? 0,
        activeItemsCount: view2d?.activeItemsContainer?.children?.length ?? 0,
      };
    });

    expect(viewInfo.hasScene).toBe(true);
    expect(viewInfo.hasView2d).toBe(true);
    // There should be children in the stage
    expect(viewInfo.stageChildCount).toBeGreaterThan(0);

    // Wait 500ms to check they persist
    await page.waitForTimeout(500);

    // Check again
    const laterViewInfo = await page.evaluate(() => {
      const win = window as unknown as {
        __gameTest?: {
          ecs?: {
            getScene?: () => {
              view2d?: {
                stage?: { children?: unknown[] };
                activeItemsContainer?: { children?: unknown[] };
              };
            };
          };
        };
      };
      const scene = win.__gameTest?.ecs?.getScene?.();
      const view2d = scene?.view2d;
      return {
        stageChildCount: view2d?.stage?.children?.length ?? 0,
        activeItemsCount: view2d?.activeItemsContainer?.children?.length ?? 0,
      };
    });

    // Child counts should remain consistent
    expect(laterViewInfo.stageChildCount).toBe(viewInfo.stageChildCount);
    expect(laterViewInfo.activeItemsCount).toBe(viewInfo.activeItemsCount);
  });

  test('no errors occur after level load during idle', async ({ page }) => {
    const telemetry = attachTelemetry(page);
    await page.goto('/?testMode=1&region=test&level=0');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);

    // Check no errors immediately after load
    const immediateErrors = getErrors(telemetry);
    expect(immediateErrors).toHaveLength(0);

    // Let the game run for 2 seconds to catch any delayed errors
    await page.waitForTimeout(2000);

    // Check for any errors that occurred during idle
    const laterErrors = getErrors(telemetry);
    expect(laterErrors).toHaveLength(0);

    // Also check harness captured errors
    const harnessErrors = await harness.getErrors();
    expect(harnessErrors).toHaveLength(0);

    // Verify entities still exist (no cleanup errors)
    const entities = await harness.getEntities();
    const partEntities = filterByComponent(entities, 'part');
    const screwEntities = filterByComponent(entities, 'screw');

    expect(partEntities).toHaveLength(2);
    expect(screwEntities).toHaveLength(6);
  });

  test('no errors during multiple frame updates', async ({ page }) => {
    const telemetry = attachTelemetry(page);
    await page.goto('/?testMode=1&region=test&level=0');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);

    // Run for 3 seconds, checking periodically
    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(500);

      const errors = getErrors(telemetry);
      const harnessErrors = await harness.getErrors();

      // Fail fast if any error occurs
      if (errors.length > 0) {
        printTelemetry(telemetry);
      }
      expect(errors).toHaveLength(0);
      expect(harnessErrors).toHaveLength(0);
    }

    // Final entity check
    const entities = await harness.getEntities();
    expect(filterByComponent(entities, 'part')).toHaveLength(2);
    expect(filterByComponent(entities, 'screw')).toHaveLength(6);
  });

  test('screws have consistent scale after landing in colored trays', async ({
    page,
  }) => {
    const telemetry = attachTelemetry(page);
    await page.goto('/?testMode=1&region=test&level=0');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);

    // Tap screws of all 4 colors
    // Test level has: red tray visible, blue tray visible, green tray hidden, yellow tray hidden
    // First tap red and blue (visible trays)
    // Red screw at world position (250, 850) - board 1 at (200,800) + screw at (50,50)
    // Blue screw at world position (420, 850) - board 1 at (200,800) + screw at (220,50)
    // Green screw at (335, 930) - board 1 at (200,800) + screw at (135,130) - goes to buffer first
    // Yellow screw at (685, 865) - board 2 at (550,800) + screw at (135,65) - goes to buffer first
    const screwsToTap = [
      { color: 'red', x: 250, y: 850 },
      { color: 'blue', x: 420, y: 850 },
      { color: 'green', x: 335, y: 930 }, // Will go to buffer (hidden tray)
      { color: 'yellow', x: 685, y: 865 }, // Will go to buffer (hidden tray)
    ];

    for (const screwInfo of screwsToTap) {
      // Tap the screw
      await harness.act({
        type: 'pointerDown',
        x: screwInfo.x,
        y: screwInfo.y,
      });
      await harness.act({ type: 'pointerUp', x: screwInfo.x, y: screwInfo.y });

      // Wait for animation to complete (pop-out 0.15s + flight 0.4s + settle 0.1s = ~0.65s)
      await page.waitForTimeout(1000);
    }

    // Get sprite scales directly from the scene (AnimationSystem sets sprite.scale, not entity.scale)
    interface SpriteScaleInfo {
      color: string;
      state: string;
      spriteScaleX: number;
      spriteScaleY: number;
    }
    const spriteScales = await page.evaluate(() => {
      const win = window as unknown as {
        __gameTest?: {
          ecs?: {
            getScene?: () => {
              allEntities?: {
                children?: {
                  c?: {
                    screw?: { color: string; state: string };
                  };
                  view?: {
                    children?: { scale?: { x: number; y: number } }[];
                  };
                }[];
              };
            };
          };
        };
      };

      const scene = win.__gameTest?.ecs?.getScene?.();
      const entities = scene?.allEntities?.children ?? [];
      const results: SpriteScaleInfo[] = [];

      for (const entity of entities) {
        const screwComp = entity.c?.screw;
        // Check both inTray and inBuffer states (green/yellow go to buffer)
        if (
          screwComp &&
          (screwComp.state === 'inTray' || screwComp.state === 'inBuffer')
        ) {
          // Get the sprite (first child of view)
          const sprite = entity.view?.children?.[0];
          if (sprite?.scale) {
            results.push({
              color: screwComp.color,
              state: screwComp.state,
              spriteScaleX: sprite.scale.x,
              spriteScaleY: sprite.scale.y,
            });
          }
        }
      }

      return results;
    });

    // Verify we have scale data for all 4 colors
    expect(spriteScales.length).toBe(4);

    // Check scale based on state:
    // - inTray: TRAY_SLOT_SCALE = 0.5
    // - inBuffer: BUFFER_SLOT_SCALE = 0.7 (updated from 1.0 per Figma)
    const tolerance = 0.01;

    for (const screw of spriteScales) {
      const expectedScale = screw.state === 'inTray' ? 0.5 : 0.7;
      expect(screw.spriteScaleX).toBeCloseTo(expectedScale, 2);
      expect(screw.spriteScaleY).toBeCloseTo(expectedScale, 2);
    }

    // Verify all inTray screws have the same scale
    const inTrayScrews = spriteScales.filter((s) => s.state === 'inTray');
    const firstInTray = inTrayScrews[0];
    if (inTrayScrews.length > 1 && firstInTray) {
      for (const screw of inTrayScrews) {
        expect(
          Math.abs(screw.spriteScaleX - firstInTray.spriteScaleX)
        ).toBeLessThan(tolerance);
        expect(
          Math.abs(screw.spriteScaleY - firstInTray.spriteScaleY)
        ).toBeLessThan(tolerance);
      }
    }

    // No errors should have occurred
    const errors = getErrors(telemetry);
    expect(errors).toHaveLength(0);
  });

  test('screenshot comparison: red vs blue screw in colored trays', async ({
    page,
  }) => {
    const telemetry = attachTelemetry(page);
    await page.goto('/?testMode=1&region=test&level=0');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);

    // Tap red screw first (at world position 250, 850)
    await harness.act({ type: 'pointerDown', x: 250, y: 850 });
    await harness.act({ type: 'pointerUp', x: 250, y: 850 });
    await page.waitForTimeout(1000); // Wait for animation

    // Tap blue screw (at world position 420, 850)
    await harness.act({ type: 'pointerDown', x: 420, y: 850 });
    await harness.act({ type: 'pointerUp', x: 420, y: 850 });
    await page.waitForTimeout(1000); // Wait for animation

    // Take a screenshot of the colored trays area
    await page.screenshot({
      path: 'e2e/screenshots/screws-in-trays.png',
      fullPage: false,
    });

    // Get detailed sprite information for both red and blue screws
    interface ScriteDetails {
      color: string;
      state: string;
      spriteScaleX: number;
      spriteScaleY: number;
      textureWidth: number;
      textureHeight: number;
      boundsWidth: number;
      boundsHeight: number;
      anchorX: number;
      anchorY: number;
      worldX: number;
      worldY: number;
    }
    const screwDetails = await page.evaluate(() => {
      const win = window as unknown as {
        __gameTest?: {
          ecs?: {
            getScene?: () => {
              allEntities?: {
                children?: {
                  c?: {
                    screw?: { color: string; state: string };
                  };
                  view?: {
                    children?: {
                      scale?: { x: number; y: number };
                      texture?: { width: number; height: number };
                      getBounds?: () => { width: number; height: number };
                      anchor?: { x: number; y: number };
                      getGlobalPosition?: () => { x: number; y: number };
                    }[];
                  };
                }[];
              };
            };
          };
        };
      };

      const scene = win.__gameTest?.ecs?.getScene?.();
      const entities = scene?.allEntities?.children ?? [];
      const results: ScriteDetails[] = [];

      for (const entity of entities) {
        const screwComp = entity.c?.screw;
        if (screwComp?.state === 'inTray') {
          const sprite = entity.view?.children?.[0];
          if (sprite) {
            const bounds = sprite.getBounds?.();
            const globalPos = sprite.getGlobalPosition?.();
            results.push({
              color: screwComp.color,
              state: screwComp.state,
              spriteScaleX: sprite.scale?.x ?? 0,
              spriteScaleY: sprite.scale?.y ?? 0,
              textureWidth: sprite.texture?.width ?? 0,
              textureHeight: sprite.texture?.height ?? 0,
              boundsWidth: bounds?.width ?? 0,
              boundsHeight: bounds?.height ?? 0,
              anchorX: sprite.anchor?.x ?? 0,
              anchorY: sprite.anchor?.y ?? 0,
              worldX: globalPos?.x ?? 0,
              worldY: globalPos?.y ?? 0,
            });
          }
        }
      }

      return results;
    });

    // Find red and blue screws
    const redScrew = screwDetails.find((s) => s.color === 'red');
    const blueScrew = screwDetails.find((s) => s.color === 'blue');

    expect(redScrew).toBeDefined();
    expect(blueScrew).toBeDefined();

    if (redScrew && blueScrew) {
      // Compare scales - should be identical
      expect(redScrew.spriteScaleX).toBeCloseTo(blueScrew.spriteScaleX, 2);
      expect(redScrew.spriteScaleY).toBeCloseTo(blueScrew.spriteScaleY, 2);

      // Compare texture sizes - should be identical (both should be long screw: 80x100)
      expect(redScrew.textureWidth).toBe(blueScrew.textureWidth);
      expect(redScrew.textureHeight).toBe(blueScrew.textureHeight);

      // Compare rendered bounds - should be very close
      const boundsTolerance = 1;

      expect(
        Math.abs(redScrew.boundsWidth - blueScrew.boundsWidth)
      ).toBeLessThan(boundsTolerance);
      expect(
        Math.abs(redScrew.boundsHeight - blueScrew.boundsHeight)
      ).toBeLessThan(boundsTolerance);
    }

    // No errors
    const errors = getErrors(telemetry);
    expect(errors).toHaveLength(0);
  });

  test('level restart does not produce asset warnings', async ({ page }) => {
    const telemetry = attachTelemetry(page);
    await page.goto('/?testMode=1&region=test&level=0');

    const harness = createHarnessClient(page);
    await harness.waitForReady(15000);

    // Clear any warnings from initial load
    const initialWarnings = getWarnings(telemetry);
    const pixiWarningsBeforeRestart = initialWarnings.filter((w) =>
      w.includes('PixiJS Warning')
    );

    // Trigger restart by clicking the restart button
    // The restart button is at approximately (48 + 30, 140 + 30) = (78, 170) based on LAYOUT
    await harness.act({ type: 'pointerDown', x: 78, y: 170 });
    await harness.act({ type: 'pointerUp', x: 78, y: 170 });

    // Wait for level to reload
    await page.waitForTimeout(1000);

    // Get all warnings after restart
    const allWarnings = getWarnings(telemetry);
    const pixiWarningsAfterRestart = allWarnings.filter((w) =>
      w.includes('PixiJS Warning')
    );

    // Filter to only new warnings (after restart)
    const newPixiWarnings = pixiWarningsAfterRestart.slice(
      pixiWarningsBeforeRestart.length
    );

    // There should be no new PixiJS warnings about overwriting assets
    const overwriteWarnings = newPixiWarnings.filter((w) =>
      w.includes('overwriting')
    );

    if (overwriteWarnings.length > 0) {
      console.log('Asset overwrite warnings found:');
      for (const warning of overwriteWarnings) {
        console.log(`  - ${warning}`);
      }
      printTelemetry(telemetry);
    }

    expect(overwriteWarnings).toHaveLength(0);

    // Verify level reloaded correctly
    const errors = getErrors(telemetry);
    expect(errors).toHaveLength(0);

    // Check entities are back to initial state
    const entities = await harness.getEntities();
    const screwEntities = filterByComponent(entities, 'screw');
    expect(screwEntities).toHaveLength(6);
  });
});
