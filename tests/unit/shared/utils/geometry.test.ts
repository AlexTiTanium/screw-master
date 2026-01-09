/**
 * Unit tests for geometry utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  SCREW_RADIUS,
  isPointInBox,
  isCircleInBox,
  isPointInPolygon,
  isCircleInPolygon,
  isScrewInBounds,
} from '@shared/utils';
import type { BoxCollisionShape, PolygonCollisionShape } from '@shared/types';

describe('geometry utilities', () => {
  describe('SCREW_RADIUS', () => {
    it('is 40 pixels', () => {
      expect(SCREW_RADIUS).toBe(40);
    });
  });

  describe('isPointInBox', () => {
    const box: BoxCollisionShape = { type: 'box', width: 100, height: 100 };

    it('returns true for point inside', () => {
      expect(isPointInBox({ x: 50, y: 50 }, box)).toBe(true);
    });

    it('returns true for point at origin', () => {
      expect(isPointInBox({ x: 0, y: 0 }, box)).toBe(true);
    });

    it('returns true for point at max corner', () => {
      expect(isPointInBox({ x: 100, y: 100 }, box)).toBe(true);
    });

    it('returns true for point on edge', () => {
      expect(isPointInBox({ x: 50, y: 0 }, box)).toBe(true);
      expect(isPointInBox({ x: 0, y: 50 }, box)).toBe(true);
      expect(isPointInBox({ x: 100, y: 50 }, box)).toBe(true);
      expect(isPointInBox({ x: 50, y: 100 }, box)).toBe(true);
    });

    it('returns false for point left of box', () => {
      expect(isPointInBox({ x: -1, y: 50 }, box)).toBe(false);
    });

    it('returns false for point right of box', () => {
      expect(isPointInBox({ x: 101, y: 50 }, box)).toBe(false);
    });

    it('returns false for point above box', () => {
      expect(isPointInBox({ x: 50, y: -1 }, box)).toBe(false);
    });

    it('returns false for point below box', () => {
      expect(isPointInBox({ x: 50, y: 101 }, box)).toBe(false);
    });
  });

  describe('isCircleInBox', () => {
    const box: BoxCollisionShape = { type: 'box', width: 100, height: 100 };

    it('returns true when circle is fully inside', () => {
      expect(isCircleInBox({ x: 50, y: 50 }, 10, box)).toBe(true);
    });

    it('returns true when circle touches edges exactly', () => {
      expect(isCircleInBox({ x: 10, y: 50 }, 10, box)).toBe(true);
      expect(isCircleInBox({ x: 90, y: 50 }, 10, box)).toBe(true);
      expect(isCircleInBox({ x: 50, y: 10 }, 10, box)).toBe(true);
      expect(isCircleInBox({ x: 50, y: 90 }, 10, box)).toBe(true);
    });

    it('returns false when circle extends past left edge', () => {
      expect(isCircleInBox({ x: 5, y: 50 }, 10, box)).toBe(false);
    });

    it('returns false when circle extends past right edge', () => {
      expect(isCircleInBox({ x: 95, y: 50 }, 10, box)).toBe(false);
    });

    it('returns false when circle extends past top edge', () => {
      expect(isCircleInBox({ x: 50, y: 5 }, 10, box)).toBe(false);
    });

    it('returns false when circle extends past bottom edge', () => {
      expect(isCircleInBox({ x: 50, y: 95 }, 10, box)).toBe(false);
    });

    it('returns false when circle center is outside', () => {
      expect(isCircleInBox({ x: -5, y: 50 }, 10, box)).toBe(false);
    });
  });

  describe('isPointInPolygon', () => {
    // Simple triangle: (50,0), (100,100), (0,100)
    const triangle = [
      { x: 50, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ];

    it('returns true for point inside triangle', () => {
      expect(isPointInPolygon({ x: 50, y: 50 }, triangle)).toBe(true);
    });

    it('returns true for point at centroid', () => {
      expect(isPointInPolygon({ x: 50, y: 66 }, triangle)).toBe(true);
    });

    it('returns false for point outside triangle (top left)', () => {
      expect(isPointInPolygon({ x: 10, y: 10 }, triangle)).toBe(false);
    });

    it('returns false for point outside triangle (top right)', () => {
      expect(isPointInPolygon({ x: 90, y: 10 }, triangle)).toBe(false);
    });

    it('returns false for point above triangle', () => {
      expect(isPointInPolygon({ x: 50, y: -10 }, triangle)).toBe(false);
    });

    it('returns false for point below triangle', () => {
      expect(isPointInPolygon({ x: 50, y: 110 }, triangle)).toBe(false);
    });

    // Rectangle polygon
    const rectangle = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 50 },
      { x: 0, y: 50 },
    ];

    it('returns true for point inside rectangle', () => {
      expect(isPointInPolygon({ x: 50, y: 25 }, rectangle)).toBe(true);
    });

    it('returns false for point outside rectangle', () => {
      expect(isPointInPolygon({ x: 50, y: 60 }, rectangle)).toBe(false);
    });
  });

  describe('isCircleInPolygon', () => {
    // Large triangle that can fit a circle
    const triangle = [
      { x: 100, y: 0 },
      { x: 200, y: 200 },
      { x: 0, y: 200 },
    ];

    it('returns true when circle is fully inside', () => {
      // Center near bottom center of triangle
      expect(isCircleInPolygon({ x: 100, y: 150 }, 20, triangle)).toBe(true);
    });

    it('returns false when circle extends outside', () => {
      // Center near top - circle will extend past triangle edge
      expect(isCircleInPolygon({ x: 100, y: 30 }, 40, triangle)).toBe(false);
    });

    it('returns false when circle center is outside', () => {
      expect(isCircleInPolygon({ x: 10, y: 10 }, 5, triangle)).toBe(false);
    });
  });

  describe('isScrewInBounds', () => {
    describe('with box collision', () => {
      const box: BoxCollisionShape = { type: 'box', width: 270, height: 260 };

      it('returns true for screw in center', () => {
        expect(isScrewInBounds({ x: 135, y: 130 }, box)).toBe(true);
      });

      it('returns true for screw at valid corner (accounting for radius)', () => {
        // With SCREW_RADIUS=40, valid x: [40, 230], valid y: [40, 220]
        expect(isScrewInBounds({ x: 40, y: 40 }, box)).toBe(true);
        expect(isScrewInBounds({ x: 230, y: 40 }, box)).toBe(true);
        expect(isScrewInBounds({ x: 40, y: 220 }, box)).toBe(true);
        expect(isScrewInBounds({ x: 230, y: 220 }, box)).toBe(true);
      });

      it('returns false for screw too close to left edge', () => {
        expect(isScrewInBounds({ x: 30, y: 130 }, box)).toBe(false);
      });

      it('returns false for screw too close to right edge', () => {
        expect(isScrewInBounds({ x: 240, y: 130 }, box)).toBe(false);
      });

      it('returns false for screw too close to top edge', () => {
        expect(isScrewInBounds({ x: 135, y: 30 }, box)).toBe(false);
      });

      it('returns false for screw too close to bottom edge', () => {
        expect(isScrewInBounds({ x: 135, y: 230 }, box)).toBe(false);
      });

      it('accepts custom radius', () => {
        // With radius 10, valid x: [10, 260], valid y: [10, 250]
        expect(isScrewInBounds({ x: 10, y: 10 }, box, 10)).toBe(true);
        expect(isScrewInBounds({ x: 5, y: 10 }, box, 10)).toBe(false);
      });
    });

    describe('with polygon collision', () => {
      const polygon: PolygonCollisionShape = {
        type: 'polygon',
        points: [
          { x: 100, y: 0 },
          { x: 200, y: 200 },
          { x: 0, y: 200 },
        ],
      };

      it('returns true for screw in safe area', () => {
        expect(isScrewInBounds({ x: 100, y: 150 }, polygon, 20)).toBe(true);
      });

      it('returns false for screw extending outside polygon', () => {
        expect(isScrewInBounds({ x: 100, y: 30 }, polygon, 40)).toBe(false);
      });
    });
  });
});
