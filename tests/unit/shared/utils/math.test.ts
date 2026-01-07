import { describe, it, expect } from 'vitest';

import { clamp, lerp } from '@shared/utils/math';

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
});
