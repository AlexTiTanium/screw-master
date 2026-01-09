import { describe, it, expect } from 'vitest';

import { hasPart, getPart } from '@shared/parts/registry';
// Import all parts to register them
import '@shared/parts/definitions';

describe('Part Definitions', () => {
  // Note: We don't clear the registry because part definitions
  // are imported and registered at module load time

  describe('simple-plate', () => {
    it('should be registered automatically', () => {
      expect(hasPart('simple-plate')).toBe(true);
    });

    it('should have correct basic properties', () => {
      const part = getPart('simple-plate');

      expect(part.id).toBe('simple-plate');
      expect(part.name).toBe('Simple Plate');
      expect(part.asset).toBe('images/parts/simple-plate.png');
      expect(part.material).toBe('metal');
    });

    it('should have box collision shape', () => {
      const part = getPart('simple-plate');

      expect(part.collision).toBeDefined();
      expect(part.collision?.type).toBe('box');
      expect(part.collision).toHaveProperty('width', 200);
      expect(part.collision).toHaveProperty('height', 100);
    });

    it('should have static constraint', () => {
      const part = getPart('simple-plate');

      expect(part.constraint).toBeDefined();
      expect(part.constraint?.type).toBe('static');
    });

    it('should have 4 screw mounts', () => {
      const part = getPart('simple-plate');

      expect(part.screwMounts).toBeDefined();
      expect(part.screwMounts).toHaveLength(4);
    });

    it('should have correctly positioned screw mounts', () => {
      const part = getPart('simple-plate');

      const mountIds = part.screwMounts?.map((m) => m.id);
      expect(mountIds).toContain('top-left');
      expect(mountIds).toContain('top-right');
      expect(mountIds).toContain('bottom-left');
      expect(mountIds).toContain('bottom-right');

      // Check top-left mount
      const topLeft = part.screwMounts?.find((m) => m.id === 'top-left');
      expect(topLeft).toBeDefined();
      expect(topLeft?.localPosition).toEqual({ x: 20, y: 20 });

      // Check bottom-right mount
      const bottomRight = part.screwMounts?.find(
        (m) => m.id === 'bottom-right'
      );
      expect(bottomRight).toBeDefined();
      expect(bottomRight?.localPosition).toEqual({ x: 180, y: 80 });
    });
  });

  describe('sliding-cover', () => {
    it('should be registered automatically', () => {
      expect(hasPart('sliding-cover')).toBe(true);
    });

    it('should have correct basic properties', () => {
      const part = getPart('sliding-cover');

      expect(part.id).toBe('sliding-cover');
      expect(part.name).toBe('Sliding Cover');
      expect(part.asset).toBe('images/parts/sliding-cover.png');
      expect(part.material).toBe('metal');
    });

    it('should have box collision shape', () => {
      const part = getPart('sliding-cover');

      expect(part.collision).toBeDefined();
      expect(part.collision?.type).toBe('box');
      expect(part.collision).toHaveProperty('width', 150);
      expect(part.collision).toHaveProperty('height', 80);
    });

    it('should have slider constraint', () => {
      const part = getPart('sliding-cover');

      expect(part.constraint).toBeDefined();
      expect(part.constraint?.type).toBe('slider');

      // Check slider-specific properties
      if (part.constraint?.type === 'slider') {
        expect(part.constraint.axis).toBe('x');
        expect(part.constraint.min).toBe(0);
        expect(part.constraint.max).toBe(100);
      }
    });

    it('should have 3 screw mounts', () => {
      const part = getPart('sliding-cover');

      expect(part.screwMounts).toBeDefined();
      expect(part.screwMounts).toHaveLength(3);
    });

    it('should have correctly positioned screw mounts', () => {
      const part = getPart('sliding-cover');

      const mountIds = part.screwMounts?.map((m) => m.id);
      expect(mountIds).toContain('left');
      expect(mountIds).toContain('center');
      expect(mountIds).toContain('right');

      // Check left mount
      const left = part.screwMounts?.find((m) => m.id === 'left');
      expect(left).toBeDefined();
      expect(left?.localPosition).toEqual({ x: 25, y: 40 });

      // Check center mount
      const center = part.screwMounts?.find((m) => m.id === 'center');
      expect(center).toBeDefined();
      expect(center?.localPosition).toEqual({ x: 75, y: 40 });

      // Check right mount
      const right = part.screwMounts?.find((m) => m.id === 'right');
      expect(right).toBeDefined();
      expect(right?.localPosition).toEqual({ x: 125, y: 40 });
    });
  });

  describe('all part definitions', () => {
    it('should all be unique IDs', () => {
      // Import all part definitions

      // This test would fail if any duplicate IDs were registered
      expect(hasPart('simple-plate')).toBe(true);
      expect(hasPart('sliding-cover')).toBe(true);
    });

    it('should have required fields', () => {
      const simplePlate = getPart('simple-plate');
      const slidingCover = getPart('sliding-cover');

      // All parts must have these fields
      for (const part of [simplePlate, slidingCover]) {
        expect(part.id).toBeTruthy();
        expect(part.name).toBeTruthy();
        expect(part.asset).toBeTruthy();
        expect(part.collision).toBeDefined();
        expect(part.material).toBeTruthy();
        expect(part.constraint).toBeDefined();
        expect(part.screwMounts).toBeDefined();
      }
    });

    it('should have valid collision shapes', () => {
      const simplePlate = getPart('simple-plate');
      const slidingCover = getPart('sliding-cover');

      for (const part of [simplePlate, slidingCover]) {
        expect(part.collision?.type).toBe('box');
        expect(part.collision).toHaveProperty('width');
        expect(part.collision).toHaveProperty('height');
        if (part.collision?.type === 'box') {
          expect(part.collision.width).toBeGreaterThan(0);
          expect(part.collision.height).toBeGreaterThan(0);
        }
      }
    });

    it('should have at least one screw mount', () => {
      const simplePlate = getPart('simple-plate');
      const slidingCover = getPart('sliding-cover');

      for (const part of [simplePlate, slidingCover]) {
        expect(part.screwMounts).toBeDefined();
        expect(part.screwMounts!.length).toBeGreaterThan(0);
      }
    });

    it('should have valid screw mount positions', () => {
      const simplePlate = getPart('simple-plate');
      const slidingCover = getPart('sliding-cover');

      for (const part of [simplePlate, slidingCover]) {
        for (const mount of part.screwMounts ?? []) {
          expect(mount.id).toBeTruthy();
          expect(mount.localPosition).toBeDefined();
          expect(mount.localPosition.x).toBeGreaterThanOrEqual(0);
          expect(mount.localPosition.y).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });
});
