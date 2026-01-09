import { describe, it, expect, beforeEach } from 'vitest';

import {
  registerPart,
  getPart,
  hasPart,
  getAllPartIds,
  getAllParts,
  clearRegistry,
} from '@shared/parts/registry';
import type { PartDefinition } from '@shared/types';

// Helper to create a valid PartDefinition for testing
function createTestPart(
  overrides: Partial<PartDefinition> = {}
): PartDefinition {
  return {
    id: 'test-part',
    name: 'Test Part',
    asset: 'images/test.png',
    collision: { type: 'box', width: 100, height: 100 },
    material: 'metal',
    constraint: { type: 'static' },
    screwMounts: [],
    ...overrides,
  };
}

describe('Parts Registry', () => {
  // Clear registry before each test to ensure clean state
  beforeEach(() => {
    clearRegistry();
  });

  describe('registerPart', () => {
    it('should register a new part', () => {
      const part = createTestPart({ id: 'test-part', name: 'Test Part' });

      registerPart(part);

      expect(hasPart('test-part')).toBe(true);
      expect(getPart('test-part')).toBe(part);
    });

    it('should throw error when registering duplicate part ID', () => {
      const part1 = createTestPart({ id: 'duplicate', name: 'First Part' });

      const part2 = createTestPart({ id: 'duplicate', name: 'Second Part' });

      registerPart(part1);

      expect(() => {
        registerPart(part2);
      }).toThrow('Part "duplicate" is already registered');
    });

    it('should allow registering multiple different parts', () => {
      const part1 = createTestPart({ id: 'part-1', name: 'Part 1' });

      const part2 = createTestPart({ id: 'part-2', name: 'Part 2' });

      registerPart(part1);
      registerPart(part2);

      expect(hasPart('part-1')).toBe(true);
      expect(hasPart('part-2')).toBe(true);
    });
  });

  describe('getPart', () => {
    it('should retrieve a registered part', () => {
      const part = createTestPart({
        id: 'retrieve-test',
        name: 'Retrieve Test',
      });

      registerPart(part);

      const retrieved = getPart('retrieve-test');
      expect(retrieved).toBe(part);
      expect(retrieved.name).toBe('Retrieve Test');
    });

    it('should throw error for non-existent part', () => {
      expect(() => getPart('non-existent')).toThrow(
        'Part "non-existent" not found in registry'
      );
    });

    it('should return the exact same object that was registered', () => {
      const part = createTestPart({ id: 'same-object', name: 'Same Object' });

      registerPart(part);

      const retrieved = getPart('same-object');
      expect(retrieved).toBe(part); // Strict reference equality
    });
  });

  describe('hasPart', () => {
    it('should return true for registered part', () => {
      const part = createTestPart({ id: 'exists', name: 'Exists' });

      registerPart(part);

      expect(hasPart('exists')).toBe(true);
    });

    it('should return false for non-registered part', () => {
      expect(hasPart('does-not-exist')).toBe(false);
    });

    it('should return false for part that was never registered', () => {
      registerPart(createTestPart({ id: 'other-part', name: 'Other' }));

      expect(hasPart('missing-part')).toBe(false);
    });
  });

  describe('getAllPartIds', () => {
    it('should return empty array when no parts registered', () => {
      const ids = getAllPartIds();
      expect(ids).toEqual([]);
    });

    it('should return all registered part IDs', () => {
      registerPart(createTestPart({ id: 'part-a', name: 'Part A' }));

      registerPart(createTestPart({ id: 'part-b', name: 'Part B' }));

      registerPart(createTestPart({ id: 'part-c', name: 'Part C' }));

      const ids = getAllPartIds();
      expect(ids).toHaveLength(3);
      expect(ids).toContain('part-a');
      expect(ids).toContain('part-b');
      expect(ids).toContain('part-c');
    });

    it('should return array of strings', () => {
      registerPart(createTestPart({ id: 'string-test', name: 'String Test' }));

      const ids = getAllPartIds();
      expect(Array.isArray(ids)).toBe(true);
      expect(typeof ids[0]).toBe('string');
    });
  });

  describe('getAllParts', () => {
    it('should return empty array when no parts registered', () => {
      const parts = getAllParts();
      expect(parts).toEqual([]);
    });

    it('should return all registered part definitions', () => {
      const part1 = createTestPart({ id: 'all-1', name: 'All 1' });

      const part2 = createTestPart({ id: 'all-2', name: 'All 2' });

      registerPart(part1);
      registerPart(part2);

      const parts = getAllParts();
      expect(parts).toHaveLength(2);
      expect(parts).toContain(part1);
      expect(parts).toContain(part2);
    });

    it('should return array of PartDefinition objects', () => {
      registerPart(createTestPart({ id: 'object-test', name: 'Object Test' }));

      const parts = getAllParts();
      expect(Array.isArray(parts)).toBe(true);
      expect(parts[0]).toHaveProperty('id');
      expect(parts[0]).toHaveProperty('name');
      expect(parts[0]).toHaveProperty('asset');
      expect(parts[0]).toHaveProperty('collision');
      expect(parts[0]).toHaveProperty('material');
    });

    it('should return the exact same objects that were registered', () => {
      const part = createTestPart({
        id: 'reference-test',
        name: 'Reference Test',
      });

      registerPart(part);

      const parts = getAllParts();
      expect(parts[0]).toBe(part); // Strict reference equality
    });
  });

  describe('clearRegistry', () => {
    it('should remove all registered parts', () => {
      registerPart(createTestPart({ id: 'clear-1', name: 'Clear 1' }));

      registerPart(createTestPart({ id: 'clear-2', name: 'Clear 2' }));

      expect(getAllPartIds()).toHaveLength(2);

      clearRegistry();

      expect(getAllPartIds()).toHaveLength(0);
      expect(hasPart('clear-1')).toBe(false);
      expect(hasPart('clear-2')).toBe(false);
    });

    it('should allow re-registering parts after clear', () => {
      const part = createTestPart({ id: 're-register', name: 'Re-register' });

      registerPart(part);
      clearRegistry();

      // Should not throw error on re-registration after clear
      expect(() => {
        registerPart(part);
      }).not.toThrow();
      expect(hasPart('re-register')).toBe(true);
    });

    it('should work on empty registry', () => {
      expect(() => {
        clearRegistry();
      }).not.toThrow();
      expect(getAllPartIds()).toEqual([]);
    });
  });
});
