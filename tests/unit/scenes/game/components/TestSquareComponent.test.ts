import { describe, it, expect } from 'vitest';

import { TestSquareComponent } from '@scenes/game/components/TestSquareComponent';

describe('TestSquareComponent', () => {
  describe('component definition', () => {
    it('should have correct NAME property', () => {
      expect(TestSquareComponent.NAME).toBe('testSquare');
    });

    it('should have default size of 100', () => {
      const component = new TestSquareComponent();
      expect(component.size).toBe(100);
    });

    it('should have default color of 0xff0000 (red)', () => {
      const component = new TestSquareComponent();
      expect(component.color).toBe(0xff0000);
    });
  });

  describe('init', () => {
    it('should initialize with provided size and color', () => {
      const component = new TestSquareComponent();
      component.init!({ size: 50, color: 0x00ff00 });

      expect(component.size).toBe(50);
      expect(component.color).toBe(0x00ff00);
    });

    it('should initialize with small size', () => {
      const component = new TestSquareComponent();
      component.init!({ size: 1, color: 0xffffff });

      expect(component.size).toBe(1);
    });

    it('should initialize with large size', () => {
      const component = new TestSquareComponent();
      component.init!({ size: 1000, color: 0x000000 });

      expect(component.size).toBe(1000);
    });

    it('should initialize with black color (0x000000)', () => {
      const component = new TestSquareComponent();
      component.init!({ size: 100, color: 0x000000 });

      expect(component.color).toBe(0x000000);
    });

    it('should initialize with white color (0xffffff)', () => {
      const component = new TestSquareComponent();
      component.init!({ size: 100, color: 0xffffff });

      expect(component.color).toBe(0xffffff);
    });

    it('should initialize with common colors', () => {
      const component = new TestSquareComponent();

      // Red
      component.init!({ size: 100, color: 0xff0000 });
      expect(component.color).toBe(0xff0000);

      // Green
      component.init!({ size: 100, color: 0x00ff00 });
      expect(component.color).toBe(0x00ff00);

      // Blue
      component.init!({ size: 100, color: 0x0000ff });
      expect(component.color).toBe(0x0000ff);
    });
  });

  describe('reset', () => {
    it('should reset size to default value', () => {
      const component = new TestSquareComponent();
      component.init!({ size: 50, color: 0x00ff00 });

      component.reset!();

      expect(component.size).toBe(100);
    });

    it('should reset color to default value', () => {
      const component = new TestSquareComponent();
      component.init!({ size: 50, color: 0x00ff00 });

      component.reset!();

      expect(component.color).toBe(0xff0000);
    });

    it('should reset all properties', () => {
      const component = new TestSquareComponent();
      component.init!({ size: 200, color: 0xaabbcc });

      component.reset!();

      expect(component.size).toBe(100);
      expect(component.color).toBe(0xff0000);
    });

    it('should be reusable after reset', () => {
      const component = new TestSquareComponent();

      // First use
      component.init!({ size: 50, color: 0x00ff00 });
      expect(component.size).toBe(50);
      expect(component.color).toBe(0x00ff00);

      // Reset
      component.reset!();
      expect(component.size).toBe(100);
      expect(component.color).toBe(0xff0000);

      // Second use
      component.init!({ size: 75, color: 0x0000ff });
      expect(component.size).toBe(75);
      expect(component.color).toBe(0x0000ff);
    });
  });

  describe('data mutation', () => {
    it('should allow direct mutation of size', () => {
      const component = new TestSquareComponent();
      component.init!({ size: 100, color: 0xff0000 });

      component.size = 150;

      expect(component.size).toBe(150);
      expect(component.color).toBe(0xff0000); // Other property unchanged
    });

    it('should allow direct mutation of color', () => {
      const component = new TestSquareComponent();
      component.init!({ size: 100, color: 0xff0000 });

      component.color = 0x00ff00;

      expect(component.color).toBe(0x00ff00);
      expect(component.size).toBe(100); // Other property unchanged
    });

    it('should maintain values across multiple reads', () => {
      const component = new TestSquareComponent();
      component.init!({ size: 75, color: 0xabcdef });

      const size1 = component.size;
      const size2 = component.size;
      const color1 = component.color;
      const color2 = component.color;

      expect(size1).toBe(size2);
      expect(color1).toBe(color2);
      expect(size1).toBe(75);
      expect(color1).toBe(0xabcdef);
    });
  });

  describe('edge cases', () => {
    it('should handle zero size', () => {
      const component = new TestSquareComponent();
      component.init!({ size: 0, color: 0xff0000 });

      expect(component.size).toBe(0);
    });

    it('should handle negative size', () => {
      const component = new TestSquareComponent();
      component.init!({ size: -50, color: 0xff0000 });

      expect(component.size).toBe(-50);
    });

    it('should handle fractional size', () => {
      const component = new TestSquareComponent();
      component.init!({ size: 50.5, color: 0xff0000 });

      expect(component.size).toBe(50.5);
    });

    it('should handle color values outside valid hex range', () => {
      const component = new TestSquareComponent();
      component.init!({ size: 100, color: 0x1000000 });

      expect(component.color).toBe(0x1000000);
    });

    it('should handle negative color values', () => {
      const component = new TestSquareComponent();
      component.init!({ size: 100, color: -1 });

      expect(component.color).toBe(-1);
    });
  });
});
