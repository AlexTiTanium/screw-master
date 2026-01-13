import { describe, it, expect } from 'vitest';

import {
  clamp,
  lerp,
  lerpAngle,
  distance,
  lerp2D,
  clampPosition,
} from '@shared/utils/math';

describe('Math utilities', () => {
  describe('clamp', () => {
    it('should return value when within range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
    });

    it('should return min when value is below range', () => {
      expect(clamp(-5, 0, 10)).toBe(0);
    });

    it('should return max when value is above range', () => {
      expect(clamp(15, 0, 10)).toBe(10);
    });

    it('should handle equal min and max', () => {
      expect(clamp(5, 5, 5)).toBe(5);
    });

    it('should handle negative ranges', () => {
      expect(clamp(-5, -10, -1)).toBe(-5);
      expect(clamp(-15, -10, -1)).toBe(-10);
      expect(clamp(0, -10, -1)).toBe(-1);
    });
  });

  describe('lerp', () => {
    it('should return start when t is 0', () => {
      expect(lerp(0, 100, 0)).toBe(0);
    });

    it('should return end when t is 1', () => {
      expect(lerp(0, 100, 1)).toBe(100);
    });

    it('should return midpoint when t is 0.5', () => {
      expect(lerp(0, 100, 0.5)).toBe(50);
    });

    it('should clamp t below 0', () => {
      expect(lerp(0, 100, -0.5)).toBe(0);
    });

    it('should clamp t above 1', () => {
      expect(lerp(0, 100, 1.5)).toBe(100);
    });

    it('should work with negative values', () => {
      expect(lerp(-100, 100, 0.5)).toBe(0);
      expect(lerp(-50, -10, 0.5)).toBe(-30);
    });
  });

  describe('lerpAngle', () => {
    it('should return start angle when t is 0', () => {
      expect(lerpAngle(0, Math.PI / 2, 0)).toBe(0);
    });

    it('should return end angle when t is 1', () => {
      expect(lerpAngle(0, Math.PI / 2, 1)).toBeCloseTo(Math.PI / 2);
    });

    it('should return midpoint when t is 0.5', () => {
      expect(lerpAngle(0, Math.PI / 2, 0.5)).toBeCloseTo(Math.PI / 4);
    });

    it('should take shortest path across π/-π boundary (positive to negative)', () => {
      // From almost π to almost -π should go through π (short path of ~0.4 radians)
      // Not the long way through 0 (~5.9 radians)
      const result = lerpAngle(Math.PI * 0.9, -Math.PI * 0.9, 0.5);
      // Midpoint should be at or near π (or -π, same angle)
      expect(Math.abs(result)).toBeCloseTo(Math.PI, 1);
    });

    it('should take shortest path across π/-π boundary (negative to positive)', () => {
      // From almost -π to almost π should go through -π (short path)
      const result = lerpAngle(-Math.PI * 0.9, Math.PI * 0.9, 0.5);
      expect(Math.abs(result)).toBeCloseTo(Math.PI, 1);
    });

    it('should clamp t below 0', () => {
      expect(lerpAngle(0, Math.PI, -0.5)).toBe(0);
    });

    it('should clamp t above 1', () => {
      expect(lerpAngle(0, Math.PI, 1.5)).toBeCloseTo(Math.PI);
    });

    it('should work with negative angles', () => {
      expect(lerpAngle(-Math.PI / 2, 0, 0.5)).toBeCloseTo(-Math.PI / 4);
    });

    it('should handle same start and end angle', () => {
      expect(lerpAngle(1.5, 1.5, 0.5)).toBeCloseTo(1.5);
    });

    it('should interpolate correctly for small angle differences', () => {
      expect(lerpAngle(0.1, 0.3, 0.5)).toBeCloseTo(0.2);
    });
  });

  describe('distance', () => {
    it('should calculate distance between two points', () => {
      expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    });

    it('should return 0 for same point', () => {
      expect(distance({ x: 10, y: 20 }, { x: 10, y: 20 })).toBe(0);
    });

    it('should handle negative coordinates', () => {
      expect(distance({ x: -3, y: -4 }, { x: 0, y: 0 })).toBe(5);
      expect(distance({ x: 0, y: 0 }, { x: -3, y: -4 })).toBe(5);
    });

    it('should work with decimal results', () => {
      const result = distance({ x: 0, y: 0 }, { x: 1, y: 1 });
      expect(result).toBeCloseTo(Math.sqrt(2), 5);
    });

    it('should handle horizontal distance', () => {
      expect(distance({ x: 0, y: 0 }, { x: 10, y: 0 })).toBe(10);
    });

    it('should handle vertical distance', () => {
      expect(distance({ x: 0, y: 0 }, { x: 0, y: 10 })).toBe(10);
    });
  });

  describe('lerp2D', () => {
    it('should return start point when t is 0', () => {
      const result = lerp2D({ x: 0, y: 0 }, { x: 100, y: 100 }, 0);
      expect(result).toEqual({ x: 0, y: 0 });
    });

    it('should return end point when t is 1', () => {
      const result = lerp2D({ x: 0, y: 0 }, { x: 100, y: 100 }, 1);
      expect(result).toEqual({ x: 100, y: 100 });
    });

    it('should return midpoint when t is 0.5', () => {
      const result = lerp2D({ x: 0, y: 0 }, { x: 100, y: 100 }, 0.5);
      expect(result).toEqual({ x: 50, y: 50 });
    });

    it('should interpolate both x and y independently', () => {
      const result = lerp2D({ x: 0, y: 100 }, { x: 100, y: 0 }, 0.5);
      expect(result).toEqual({ x: 50, y: 50 });
    });

    it('should clamp t below 0', () => {
      const result = lerp2D({ x: 0, y: 0 }, { x: 100, y: 100 }, -0.5);
      expect(result).toEqual({ x: 0, y: 0 });
    });

    it('should clamp t above 1', () => {
      const result = lerp2D({ x: 0, y: 0 }, { x: 100, y: 100 }, 1.5);
      expect(result).toEqual({ x: 100, y: 100 });
    });

    it('should work with negative coordinates', () => {
      const result = lerp2D({ x: -100, y: -100 }, { x: 100, y: 100 }, 0.5);
      expect(result).toEqual({ x: 0, y: 0 });
    });
  });

  describe('clampPosition', () => {
    it('should return position when within bounds', () => {
      const result = clampPosition(
        { x: 50, y: 50 },
        { width: 100, height: 100 }
      );
      expect(result).toEqual({ x: 50, y: 50 });
    });

    it('should clamp x to 0 when negative', () => {
      const result = clampPosition(
        { x: -10, y: 50 },
        { width: 100, height: 100 }
      );
      expect(result).toEqual({ x: 0, y: 50 });
    });

    it('should clamp y to 0 when negative', () => {
      const result = clampPosition(
        { x: 50, y: -10 },
        { width: 100, height: 100 }
      );
      expect(result).toEqual({ x: 50, y: 0 });
    });

    it('should clamp x to width when exceeding bounds', () => {
      const result = clampPosition(
        { x: 150, y: 50 },
        { width: 100, height: 100 }
      );
      expect(result).toEqual({ x: 100, y: 50 });
    });

    it('should clamp y to height when exceeding bounds', () => {
      const result = clampPosition(
        { x: 50, y: 150 },
        { width: 100, height: 100 }
      );
      expect(result).toEqual({ x: 50, y: 100 });
    });

    it('should clamp both x and y when both exceed bounds', () => {
      const result = clampPosition(
        { x: -10, y: 150 },
        { width: 100, height: 100 }
      );
      expect(result).toEqual({ x: 0, y: 100 });
    });

    it('should work with different bounds', () => {
      const result = clampPosition(
        { x: 500, y: 1000 },
        { width: 1080, height: 1920 }
      );
      expect(result).toEqual({ x: 500, y: 1000 });
    });

    it('should handle position at exactly 0,0', () => {
      const result = clampPosition({ x: 0, y: 0 }, { width: 100, height: 100 });
      expect(result).toEqual({ x: 0, y: 0 });
    });

    it('should handle position at exactly width,height', () => {
      const result = clampPosition(
        { x: 100, y: 100 },
        { width: 100, height: 100 }
      );
      expect(result).toEqual({ x: 100, y: 100 });
    });
  });
});
