/**
 * Unit tests for level and region validation functions.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  validateLevel,
  validateRegion,
  getLevelById,
  getLevelByIndex,
  type ValidationError,
} from '@shared/levels';
import { registerPart, clearRegistry } from '@shared/parts';
import {
  ScrewColor,
  type PartDefinition,
  type LevelDefinition,
  type RegionDefinition,
  type TrayConfig,
} from '@shared/types';

/**
 * Get first error from array, throwing if none exist.
 */
function firstError(errors: ValidationError[]): ValidationError {
  const error = errors[0];
  if (!error) throw new Error('Expected at least one error');
  return error;
}

/**
 * Get first warning from array, throwing if none exist.
 */
function firstWarning(warnings: ValidationError[]): ValidationError {
  const warning = warnings[0];
  if (!warning) throw new Error('Expected at least one warning');
  return warning;
}

/**
 * Create a test part definition with specified mount points.
 */
function createTestPart(id: string, mounts: string[]): PartDefinition {
  return {
    id,
    name: `Test Part ${id}`,
    asset: null,
    collision: { type: 'box', width: 100, height: 100 },
    material: 'metal',
    constraint: { type: 'static' },
    screwMounts: mounts.map((mountId) => ({
      id: mountId,
      localPosition: { x: 0, y: 0 },
    })),
  };
}

/**
 * Create valid tray configuration.
 */
function createValidTrays(): [TrayConfig, TrayConfig, TrayConfig, TrayConfig] {
  return [
    { color: ScrewColor.Red, capacity: 4, hidden: false },
    { color: ScrewColor.Blue, capacity: 3, hidden: false },
    { color: ScrewColor.Green, capacity: 2, hidden: true },
    { color: ScrewColor.Yellow, capacity: 2, hidden: true },
  ];
}

/**
 * Create a valid level definition with optional overrides.
 */
function createValidLevel(
  overrides?: Partial<LevelDefinition>
): LevelDefinition {
  return {
    version: 1,
    id: 'test-level',
    name: 'Test Level',
    parts: [
      {
        partId: 'test-part',
        position: { x: 100, y: 100 },
        layer: 1,
        screws: [{ mountId: 'mount-a', color: ScrewColor.Red }],
      },
    ],
    trays: createValidTrays(),
    win: { type: 'allScrewsRemoved' },
    ...overrides,
  };
}

/**
 * Create a valid region definition with optional overrides.
 */
function createValidRegion(
  overrides?: Partial<RegionDefinition>
): RegionDefinition {
  const levels: LevelDefinition[] = [];
  for (let i = 0; i < 10; i++) {
    levels.push(createValidLevel({ id: `level-${String(i)}` }));
  }
  return {
    version: 1,
    id: 'test-region',
    name: 'Test Region',
    levels,
    ...overrides,
  };
}

describe('Level Loader', () => {
  beforeEach(() => {
    // Register test part before each test
    registerPart(
      createTestPart('test-part', ['mount-a', 'mount-b', 'mount-c'])
    );
  });

  afterEach(() => {
    // Clear registry after each test for isolation
    clearRegistry();
  });

  describe('validateLevel', () => {
    describe('valid levels', () => {
      it('passes with all required fields', () => {
        const level = createValidLevel();
        const result = validateLevel(level);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('passes with optional bufferCapacity', () => {
        const level = createValidLevel({ bufferCapacity: 5 });
        const result = validateLevel(level);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('passes with allScrewsRemoved win condition', () => {
        const level = createValidLevel({ win: { type: 'allScrewsRemoved' } });
        const result = validateLevel(level);

        expect(result.valid).toBe(true);
      });

      it('passes with valid partsRemoved win condition', () => {
        const level = createValidLevel({
          win: { type: 'partsRemoved', partIndices: [0] },
        });
        const result = validateLevel(level);

        expect(result.valid).toBe(true);
      });

      it('passes with valid targetFreed win condition', () => {
        const level = createValidLevel({
          win: { type: 'targetFreed', targetPartIndex: 0 },
        });
        const result = validateLevel(level);

        expect(result.valid).toBe(true);
      });
    });

    describe('tray validation', () => {
      it('produces error when tray capacity < 1', () => {
        const trays = createValidTrays();
        trays[0].capacity = 0;
        const level = createValidLevel({ trays });
        const result = validateLevel(level);

        expect(result.valid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(firstError(result.errors).path).toBe('trays[0].capacity');
        expect(firstError(result.errors).message).toContain('1-4');
      });

      it('produces error when tray capacity > 4', () => {
        const trays = createValidTrays();
        trays[1].capacity = 5;
        const level = createValidLevel({ trays });
        const result = validateLevel(level);

        expect(result.valid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(firstError(result.errors).path).toBe('trays[1].capacity');
      });

      it('produces multiple errors for multiple invalid trays', () => {
        const trays = createValidTrays();
        trays[0].capacity = 0;
        trays[2].capacity = 10;
        const level = createValidLevel({ trays });
        const result = validateLevel(level);

        expect(result.valid).toBe(false);
        expect(result.errors).toHaveLength(2);
      });
    });

    describe('buffer capacity validation', () => {
      it('produces error when bufferCapacity is 0', () => {
        const level = createValidLevel({ bufferCapacity: 0 });
        const result = validateLevel(level);

        expect(result.valid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(firstError(result.errors).path).toBe('bufferCapacity');
      });

      it('produces error when bufferCapacity is negative', () => {
        const level = createValidLevel({ bufferCapacity: -1 });
        const result = validateLevel(level);

        expect(result.valid).toBe(false);
        expect(firstError(result.errors).path).toBe('bufferCapacity');
      });

      it('passes when bufferCapacity is undefined', () => {
        const level = createValidLevel();
        delete level.bufferCapacity;
        const result = validateLevel(level);

        expect(result.valid).toBe(true);
      });
    });

    describe('part validation', () => {
      it('produces error for unknown partId', () => {
        const level = createValidLevel({
          parts: [
            {
              partId: 'unknown-part',
              position: { x: 0, y: 0 },
              layer: 1,
              screws: [],
            },
          ],
        });
        const result = validateLevel(level);

        expect(result.valid).toBe(false);
        expect(firstError(result.errors).path).toBe('parts[0].partId');
        expect(firstError(result.errors).message).toContain('unknown-part');
      });

      it('produces error for invalid screw mountId', () => {
        const level = createValidLevel({
          parts: [
            {
              partId: 'test-part',
              position: { x: 0, y: 0 },
              layer: 1,
              screws: [{ mountId: 'invalid-mount', color: ScrewColor.Red }],
            },
          ],
        });
        const result = validateLevel(level);

        expect(result.valid).toBe(false);
        expect(firstError(result.errors).path).toBe(
          'parts[0].screws[0].mountId'
        );
        expect(firstError(result.errors).message).toContain('invalid-mount');
        expect(firstError(result.errors).message).toContain('mount-a');
      });

      it('produces error for duplicate screw on same mount', () => {
        const level = createValidLevel({
          parts: [
            {
              partId: 'test-part',
              position: { x: 0, y: 0 },
              layer: 1,
              screws: [
                { mountId: 'mount-a', color: ScrewColor.Red },
                { mountId: 'mount-a', color: ScrewColor.Blue },
              ],
            },
          ],
        });
        const result = validateLevel(level);

        expect(result.valid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(firstError(result.errors).path).toBe(
          'parts[0].screws[1].mountId'
        );
        expect(firstError(result.errors).message).toContain('Duplicate');
      });
    });

    describe('win condition validation', () => {
      it('produces error for partsRemoved with negative index', () => {
        const level = createValidLevel({
          win: { type: 'partsRemoved', partIndices: [-1] },
        });
        const result = validateLevel(level);

        expect(result.valid).toBe(false);
        expect(firstError(result.errors).path).toBe('win.partIndices');
      });

      it('produces error for partsRemoved with out-of-bounds index', () => {
        const level = createValidLevel({
          win: { type: 'partsRemoved', partIndices: [99] },
        });
        const result = validateLevel(level);

        expect(result.valid).toBe(false);
        expect(firstError(result.errors).path).toBe('win.partIndices');
        expect(firstError(result.errors).message).toContain('99');
      });

      it('produces error for targetFreed with invalid index', () => {
        const level = createValidLevel({
          win: { type: 'targetFreed', targetPartIndex: 5 },
        });
        const result = validateLevel(level);

        expect(result.valid).toBe(false);
        expect(firstError(result.errors).path).toBe('win.targetPartIndex');
      });
    });

    describe('warnings', () => {
      it('produces warning when parts share same layer', () => {
        const level = createValidLevel({
          parts: [
            {
              partId: 'test-part',
              position: { x: 0, y: 0 },
              layer: 1,
              screws: [],
            },
            {
              partId: 'test-part',
              position: { x: 50, y: 50 },
              layer: 1,
              screws: [],
            },
          ],
        });
        const result = validateLevel(level);

        expect(result.valid).toBe(true);
        expect(result.warnings).toHaveLength(1);
        expect(firstWarning(result.warnings).message).toContain(
          '2 parts share layer 1'
        );
      });
    });
  });

  describe('validateRegion', () => {
    it('passes with 10 valid levels', () => {
      const region = createValidRegion();
      const result = validateRegion(region);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('produces warning (not error) when < 10 levels', () => {
      const region = createValidRegion({
        levels: [createValidLevel({ id: 'level-0' })],
      });
      const result = validateRegion(region);

      expect(result.valid).toBe(true);
      expect(
        result.warnings.some((w) => w.message.includes('Expected 10'))
      ).toBe(true);
    });

    it('produces warning when > 10 levels', () => {
      const levels: LevelDefinition[] = [];
      for (let i = 0; i < 12; i++) {
        levels.push(createValidLevel({ id: `level-${String(i)}` }));
      }
      const region = createValidRegion({ levels });
      const result = validateRegion(region);

      expect(result.valid).toBe(true);
      expect(
        result.warnings.some((w) => w.message.includes('Expected 10'))
      ).toBe(true);
    });

    it('produces error for duplicate level IDs', () => {
      const levels = [
        createValidLevel({ id: 'duplicate-id' }),
        createValidLevel({ id: 'duplicate-id' }),
      ];
      const region = createValidRegion({ levels });
      const result = validateRegion(region);

      expect(result.valid).toBe(false);
      expect(firstError(result.errors).message).toContain('Duplicate level ID');
    });

    it('prefixes nested error paths correctly', () => {
      const levels = [createValidLevel({ id: 'level-0', bufferCapacity: 0 })];
      const region = createValidRegion({ levels });
      const result = validateRegion(region);

      expect(result.valid).toBe(false);
      expect(firstError(result.errors).path).toBe('levels[0].bufferCapacity');
    });

    it('prefixes nested warning paths correctly', () => {
      const levels = [
        createValidLevel({
          id: 'level-0',
          parts: [
            {
              partId: 'test-part',
              position: { x: 0, y: 0 },
              layer: 1,
              screws: [],
            },
            {
              partId: 'test-part',
              position: { x: 0, y: 0 },
              layer: 1,
              screws: [],
            },
          ],
        }),
      ];
      const region = createValidRegion({ levels });
      const result = validateRegion(region);

      expect(result.warnings.some((w) => w.path.startsWith('levels[0].'))).toBe(
        true
      );
    });
  });

  describe('getLevelById', () => {
    it('returns correct level when found', () => {
      const region = createValidRegion();
      const level = getLevelById(region, 'level-5');

      expect(level.id).toBe('level-5');
    });

    it('throws descriptive error when not found', () => {
      const region = createValidRegion();

      expect(() => getLevelById(region, 'nonexistent')).toThrow(
        /Level "nonexistent" not found/
      );
    });

    it('works with levels at any position', () => {
      const region = createValidRegion();

      expect(getLevelById(region, 'level-0').id).toBe('level-0');
      expect(getLevelById(region, 'level-9').id).toBe('level-9');
    });
  });

  describe('getLevelByIndex', () => {
    it('returns correct level for valid index', () => {
      const region = createValidRegion();

      expect(getLevelByIndex(region, 0).id).toBe('level-0');
      expect(getLevelByIndex(region, 5).id).toBe('level-5');
      expect(getLevelByIndex(region, 9).id).toBe('level-9');
    });

    it('throws for negative index', () => {
      const region = createValidRegion();

      expect(() => getLevelByIndex(region, -1)).toThrow(/out of bounds/);
    });

    it('throws for index >= length', () => {
      const region = createValidRegion();

      expect(() => getLevelByIndex(region, 10)).toThrow(/out of bounds/);
      expect(() => getLevelByIndex(region, 100)).toThrow(/out of bounds/);
    });

    it('error message includes valid range', () => {
      const region = createValidRegion();

      expect(() => getLevelByIndex(region, 10)).toThrow(/0-9/);
    });
  });
});
