/**
 * Integration tests that validate all existing region files
 * against play area boundaries.
 *
 * These tests ensure that all level parts fit within the 815x860
 * play area using the centered coordinate system.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { validateLevel, validateRegion } from '@shared/levels';
import type { LevelDefinition, RegionDefinition } from '@shared/types';
// Import all part definitions to register them
import '@shared/parts/definitions';

describe('Play Area Validation - All Regions', () => {
  const regionsDir = join(process.cwd(), 'assets/regions');
  let regionFiles: string[] = [];

  beforeAll(() => {
    try {
      regionFiles = readdirSync(regionsDir).filter((f) => f.endsWith('.json'));
    } catch {
      // Directory might not exist in test environment
      regionFiles = [];
    }
  });

  it('finds at least one region file', () => {
    expect(regionFiles.length).toBeGreaterThan(0);
  });

  it('validates all region files exist and are valid JSON', () => {
    for (const filename of regionFiles) {
      const filepath = join(regionsDir, filename);
      const content = readFileSync(filepath, 'utf-8');
      expect(() => JSON.parse(content) as unknown).not.toThrow();
    }
  });

  describe('play area bounds validation', () => {
    it('ensures all parts in all levels fit within play area bounds', () => {
      const allErrors: string[] = [];

      for (const filename of regionFiles) {
        const filepath = join(regionsDir, filename);
        const content = readFileSync(filepath, 'utf-8');
        const region = JSON.parse(content) as RegionDefinition;
        const result = validateRegion(region);

        // Filter for play area bound errors specifically
        const playAreaErrors = result.errors.filter((e) =>
          e.message.includes('exceeds play area bounds')
        );

        if (playAreaErrors.length > 0) {
          const errorMessages = playAreaErrors.map(
            (e) => `  ${filename} > ${e.path}: ${e.message}`
          );
          allErrors.push(...errorMessages);
        }
      }

      if (allErrors.length > 0) {
        throw new Error(
          `Parts exceed play area bounds:\n${allErrors.join('\n')}`
        );
      }
    });
  });

  /** Get list of region files for parameterized tests. */
  function getRegionFilesForTests(): string[] {
    try {
      return readdirSync(join(process.cwd(), 'assets/regions')).filter((f) =>
        f.endsWith('.json')
      );
    } catch {
      return ['no-regions-found.json'];
    }
  }

  // Generate individual tests for each region file
  describe.each(getRegionFilesForTests())('region: %s', (filename) => {
    let region: RegionDefinition | null = null;

    beforeAll(() => {
      try {
        const filepath = join(process.cwd(), 'assets/regions', filename);
        const content = readFileSync(filepath, 'utf-8');
        region = JSON.parse(content) as RegionDefinition;
      } catch {
        region = null;
      }
    });

    it('loads successfully', () => {
      if (filename === 'no-regions-found.json') {
        // Skip if no regions directory
        return;
      }
      expect(region).not.toBeNull();
    });

    it('has all parts within play area bounds', () => {
      if (!region || filename === 'no-regions-found.json') {
        return;
      }

      const result = validateRegion(region);
      const playAreaErrors = result.errors.filter((e) =>
        e.message.includes('exceeds play area bounds')
      );

      if (playAreaErrors.length > 0) {
        const messages = playAreaErrors
          .map((e) => `  - ${e.path}: ${e.message}`)
          .join('\n');
        throw new Error(`Parts exceed play area bounds:\n${messages}`);
      }
    });

    it('validates each level individually', () => {
      if (!region || filename === 'no-regions-found.json') {
        return;
      }

      const levelErrors: string[] = [];

      region.levels.forEach((level: LevelDefinition, index: number) => {
        const result = validateLevel(level);
        const playAreaErrors = result.errors.filter((e) =>
          e.message.includes('exceeds play area bounds')
        );

        if (playAreaErrors.length > 0) {
          levelErrors.push(
            `Level ${String(index)} "${level.id}": ${playAreaErrors.map((e) => e.message).join('; ')}`
          );
        }
      });

      if (levelErrors.length > 0) {
        throw new Error(
          `Levels with parts exceeding play area:\n${levelErrors.join('\n')}`
        );
      }
    });
  });
});
