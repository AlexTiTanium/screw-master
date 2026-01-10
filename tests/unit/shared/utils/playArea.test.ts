/**
 * Unit tests for play area utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  PLAY_AREA,
  localToWorld,
  worldToLocal,
  isPartInPlayArea,
  getPartBoundsInfo,
} from '@shared/utils';

describe('playArea utilities', () => {
  describe('PLAY_AREA constants', () => {
    it('has correct dimensions', () => {
      expect(PLAY_AREA.width).toBe(815);
      expect(PLAY_AREA.height).toBe(860);
    });

    it('has correct center coordinates', () => {
      expect(PLAY_AREA.centerX).toBe(540);
      expect(PLAY_AREA.centerY).toBe(1199);
    });

    it('has correct bounds', () => {
      expect(PLAY_AREA.bounds.minX).toBe(-407);
      expect(PLAY_AREA.bounds.maxX).toBe(407);
      expect(PLAY_AREA.bounds.minY).toBe(-430);
      expect(PLAY_AREA.bounds.maxY).toBe(430);
    });

    it('bounds are symmetric around zero', () => {
      expect(PLAY_AREA.bounds.minX).toBe(-PLAY_AREA.bounds.maxX);
      expect(PLAY_AREA.bounds.minY).toBe(-PLAY_AREA.bounds.maxY);
    });

    it('bounds match half dimensions', () => {
      // maxX should be approximately width/2
      expect(PLAY_AREA.bounds.maxX).toBe(Math.floor(PLAY_AREA.width / 2));
      expect(PLAY_AREA.bounds.maxY).toBe(Math.floor(PLAY_AREA.height / 2));
    });
  });

  describe('localToWorld', () => {
    it('transforms origin to play area center', () => {
      const world = localToWorld({ x: 0, y: 0 });
      expect(world.x).toBe(540);
      expect(world.y).toBe(1199);
    });

    it('transforms top-left corner', () => {
      const world = localToWorld({ x: -407, y: -430 });
      expect(world.x).toBe(133); // 540 - 407
      expect(world.y).toBe(769); // 1199 - 430
    });

    it('transforms bottom-right corner', () => {
      const world = localToWorld({ x: 407, y: 430 });
      expect(world.x).toBe(947); // 540 + 407
      expect(world.y).toBe(1629); // 1199 + 430
    });

    it('transforms positive coordinates correctly', () => {
      const world = localToWorld({ x: 100, y: 200 });
      expect(world.x).toBe(640); // 540 + 100
      expect(world.y).toBe(1399); // 1199 + 200
    });

    it('transforms negative coordinates correctly', () => {
      const world = localToWorld({ x: -100, y: -200 });
      expect(world.x).toBe(440); // 540 - 100
      expect(world.y).toBe(999); // 1199 - 200
    });
  });

  describe('worldToLocal', () => {
    it('transforms play area center to origin', () => {
      const local = worldToLocal({ x: 540, y: 1199 });
      expect(local.x).toBe(0);
      expect(local.y).toBe(0);
    });

    it('transforms top-left corner', () => {
      const local = worldToLocal({ x: 133, y: 769 });
      expect(local.x).toBe(-407);
      expect(local.y).toBe(-430);
    });

    it('transforms bottom-right corner', () => {
      const local = worldToLocal({ x: 947, y: 1629 });
      expect(local.x).toBe(407);
      expect(local.y).toBe(430);
    });

    it('is inverse of localToWorld', () => {
      const original = { x: 123, y: -256 };
      const world = localToWorld(original);
      const back = worldToLocal(world);
      expect(back.x).toBe(original.x);
      expect(back.y).toBe(original.y);
    });

    it('localToWorld is inverse of worldToLocal', () => {
      const original = { x: 600, y: 1000 };
      const local = worldToLocal(original);
      const back = localToWorld(local);
      expect(back.x).toBe(original.x);
      expect(back.y).toBe(original.y);
    });
  });

  describe('isPartInPlayArea', () => {
    describe('valid placements', () => {
      it('returns true for small part at center', () => {
        expect(isPartInPlayArea({ x: 0, y: 0 }, 100, 100)).toBe(true);
      });

      it('returns true for part touching all boundaries exactly', () => {
        // Part spanning full width and height
        expect(isPartInPlayArea({ x: 0, y: 0 }, 814, 860)).toBe(true);
      });

      it('returns true for part touching left boundary exactly', () => {
        // Part with width 100, center at x=-357: left edge at -407
        expect(isPartInPlayArea({ x: -357, y: 0 }, 100, 100)).toBe(true);
      });

      it('returns true for part touching right boundary exactly', () => {
        // Part with width 100, center at x=357: right edge at 407
        expect(isPartInPlayArea({ x: 357, y: 0 }, 100, 100)).toBe(true);
      });

      it('returns true for part touching top boundary exactly', () => {
        // Part with height 100, center at y=-380: top edge at -430
        expect(isPartInPlayArea({ x: 0, y: -380 }, 100, 100)).toBe(true);
      });

      it('returns true for part touching bottom boundary exactly', () => {
        // Part with height 100, center at y=380: bottom edge at 430
        expect(isPartInPlayArea({ x: 0, y: 380 }, 100, 100)).toBe(true);
      });
    });

    describe('invalid placements', () => {
      it('returns false for part exceeding left boundary', () => {
        // Part with width 100, center at x=-360: left edge at -410 < -407
        expect(isPartInPlayArea({ x: -360, y: 0 }, 100, 100)).toBe(false);
      });

      it('returns false for part exceeding right boundary', () => {
        // Part with width 100, center at x=360: right edge at 410 > 407
        expect(isPartInPlayArea({ x: 360, y: 0 }, 100, 100)).toBe(false);
      });

      it('returns false for part exceeding top boundary', () => {
        // Part with height 100, center at y=-385: top edge at -435 < -430
        expect(isPartInPlayArea({ x: 0, y: -385 }, 100, 100)).toBe(false);
      });

      it('returns false for part exceeding bottom boundary', () => {
        // Part with height 100, center at y=385: bottom edge at 435 > 430
        expect(isPartInPlayArea({ x: 0, y: 385 }, 100, 100)).toBe(false);
      });

      it('returns false for part too wide for play area', () => {
        expect(isPartInPlayArea({ x: 0, y: 0 }, 1000, 100)).toBe(false);
      });

      it('returns false for part too tall for play area', () => {
        expect(isPartInPlayArea({ x: 0, y: 0 }, 100, 1000)).toBe(false);
      });

      it('returns false for part center outside play area', () => {
        expect(isPartInPlayArea({ x: 500, y: 0 }, 50, 50)).toBe(false);
      });
    });

    describe('edge cases with real part sizes', () => {
      // board-walnut-square: 270x260
      it('validates board-walnut-square at center', () => {
        expect(isPartInPlayArea({ x: 0, y: 0 }, 270, 260)).toBe(true);
      });

      it('validates board-walnut-square at max valid X position', () => {
        // Max X: 407 - 135 = 272
        expect(isPartInPlayArea({ x: 272, y: 0 }, 270, 260)).toBe(true);
        expect(isPartInPlayArea({ x: 273, y: 0 }, 270, 260)).toBe(false);
      });

      // board-pine-horizontal: 501x317
      it('validates board-pine-horizontal at center', () => {
        expect(isPartInPlayArea({ x: 0, y: 0 }, 501, 317)).toBe(true);
      });

      it('validates board-pine-horizontal at max valid X position', () => {
        // Max X: 407 - 250.5 = 156.5, so 156 is valid, 157 is not
        expect(isPartInPlayArea({ x: 156, y: 0 }, 501, 317)).toBe(true);
        expect(isPartInPlayArea({ x: 157, y: 0 }, 501, 317)).toBe(false);
      });
    });
  });

  describe('getPartBoundsInfo', () => {
    it('calculates correct edge positions', () => {
      const info = getPartBoundsInfo({ x: 100, y: 50 }, 200, 100);
      expect(info.leftEdge).toBe(0); // 100 - 100
      expect(info.rightEdge).toBe(200); // 100 + 100
      expect(info.topEdge).toBe(0); // 50 - 50
      expect(info.bottomEdge).toBe(100); // 50 + 50
    });

    it('identifies exceeded bounds correctly', () => {
      // Part at x=-360 with width 100: left edge at -410 (exceeds -407)
      const info = getPartBoundsInfo({ x: -360, y: 0 }, 100, 100);
      expect(info.exceedsLeft).toBe(true);
      expect(info.exceedsRight).toBe(false);
      expect(info.exceedsTop).toBe(false);
      expect(info.exceedsBottom).toBe(false);
    });

    it('identifies multiple exceeded bounds', () => {
      // Very large part exceeds all bounds
      const info = getPartBoundsInfo({ x: 0, y: 0 }, 1000, 1000);
      expect(info.exceedsLeft).toBe(true);
      expect(info.exceedsRight).toBe(true);
      expect(info.exceedsTop).toBe(true);
      expect(info.exceedsBottom).toBe(true);
    });

    it('shows no exceeded bounds for valid placement', () => {
      const info = getPartBoundsInfo({ x: 0, y: 0 }, 100, 100);
      expect(info.exceedsLeft).toBe(false);
      expect(info.exceedsRight).toBe(false);
      expect(info.exceedsTop).toBe(false);
      expect(info.exceedsBottom).toBe(false);
    });
  });
});
