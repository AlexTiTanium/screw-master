import { describe, it, expect } from 'vitest';

import { RotationComponent } from '@scenes/game/components/RotationComponent';

describe('RotationComponent', () => {
  describe('component definition', () => {
    it('should have correct NAME property', () => {
      expect(RotationComponent.NAME).toBe('rotation');
    });

    it('should have default speed of 0', () => {
      const component = new RotationComponent();
      expect(component.speed).toBe(0);
    });
  });

  describe('init', () => {
    it('should initialize with provided speed', () => {
      const component = new RotationComponent();
      component.init!({ speed: Math.PI / 2 });

      expect(component.speed).toBe(Math.PI / 2);
    });

    it('should initialize with negative speed', () => {
      const component = new RotationComponent();
      component.init!({ speed: -Math.PI });

      expect(component.speed).toBe(-Math.PI);
    });

    it('should initialize with zero speed', () => {
      const component = new RotationComponent();
      component.init!({ speed: 0 });

      expect(component.speed).toBe(0);
    });

    it('should initialize with very small speed', () => {
      const component = new RotationComponent();
      component.init!({ speed: 0.001 });

      expect(component.speed).toBe(0.001);
    });

    it('should initialize with very large speed', () => {
      const component = new RotationComponent();
      component.init!({ speed: Math.PI * 10 });

      expect(component.speed).toBe(Math.PI * 10);
    });
  });

  describe('reset', () => {
    it('should reset speed to default value', () => {
      const component = new RotationComponent();
      component.init!({ speed: Math.PI });

      component.reset!();

      expect(component.speed).toBe(0);
    });

    it('should be reusable after reset', () => {
      const component = new RotationComponent();

      // First use
      component.init!({ speed: 1.5 });
      expect(component.speed).toBe(1.5);

      // Reset
      component.reset!();
      expect(component.speed).toBe(0);

      // Second use
      component.init!({ speed: 2.5 });
      expect(component.speed).toBe(2.5);
    });
  });

  describe('data mutation', () => {
    it('should allow direct mutation of speed', () => {
      const component = new RotationComponent();
      component.init!({ speed: 1 });

      component.speed = 2;

      expect(component.speed).toBe(2);
    });

    it('should maintain speed value across multiple reads', () => {
      const component = new RotationComponent();
      component.init!({ speed: Math.PI / 4 });

      const speed1 = component.speed;
      const speed2 = component.speed;

      expect(speed1).toBe(speed2);
      expect(speed1).toBe(Math.PI / 4);
    });
  });

  describe('edge cases', () => {
    it('should handle Infinity speed', () => {
      const component = new RotationComponent();
      component.init!({ speed: Infinity });

      expect(component.speed).toBe(Infinity);
    });

    it('should handle -Infinity speed', () => {
      const component = new RotationComponent();
      component.init!({ speed: -Infinity });

      expect(component.speed).toBe(-Infinity);
    });

    it('should handle NaN speed', () => {
      const component = new RotationComponent();
      component.init!({ speed: NaN });

      expect(component.speed).toBe(NaN);
    });
  });
});
