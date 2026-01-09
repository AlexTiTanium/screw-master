import { describe, it, expect, beforeEach, vi } from 'vitest';

import { getTestParams, isTestMode } from '@shared/debug/urlParams';

describe('URL Parameters', () => {
  // Helper to set window.location.search
  function setLocationSearch(search: string): void {
    delete (window as { location?: unknown }).location;
    (window as { location?: { search: string } }).location = { search };
  }

  beforeEach(() => {
    // Reset window.location.search before each test
    setLocationSearch('');
    // Reset import.meta.env.MODE
    vi.stubEnv('MODE', 'development');
  });

  describe('getTestParams', () => {
    it('should return default values when no parameters present', () => {
      setLocationSearch('');

      const params = getTestParams();

      expect(params).toEqual({
        testMode: false,
        seed: undefined,
        scene: undefined,
        muteAudio: false,
        skipIntro: false,
      });
    });

    it('should parse testMode flag', () => {
      setLocationSearch('?testMode');

      const params = getTestParams();

      expect(params.testMode).toBe(true);
    });

    it('should parse testMode=1 as true', () => {
      setLocationSearch('?testMode=1');

      const params = getTestParams();

      expect(params.testMode).toBe(true);
    });

    it('should parse seed parameter as number', () => {
      setLocationSearch('?seed=12345');

      const params = getTestParams();

      expect(params.seed).toBe(12345);
    });

    it('should parse seed=0 correctly', () => {
      setLocationSearch('?seed=0');

      const params = getTestParams();

      expect(params.seed).toBe(0);
    });

    it('should return undefined for missing seed', () => {
      setLocationSearch('?testMode');

      const params = getTestParams();

      expect(params.seed).toBeUndefined();
    });

    it('should parse scene parameter', () => {
      setLocationSearch('?scene=BossLevel');

      const params = getTestParams();

      expect(params.scene).toBe('BossLevel');
    });

    it('should return undefined for missing scene', () => {
      setLocationSearch('?testMode');

      const params = getTestParams();

      expect(params.scene).toBeUndefined();
    });

    it('should parse muteAudio flag', () => {
      setLocationSearch('?muteAudio');

      const params = getTestParams();

      expect(params.muteAudio).toBe(true);
    });

    it('should parse muteAudio=1 as true', () => {
      setLocationSearch('?muteAudio=1');

      const params = getTestParams();

      expect(params.muteAudio).toBe(true);
    });

    it('should parse skipIntro flag', () => {
      setLocationSearch('?skipIntro');

      const params = getTestParams();

      expect(params.skipIntro).toBe(true);
    });

    it('should parse skipIntro=1 as true', () => {
      setLocationSearch('?skipIntro=1');

      const params = getTestParams();

      expect(params.skipIntro).toBe(true);
    });

    it('should parse multiple parameters', () => {
      setLocationSearch('?testMode&seed=42&skipIntro');

      const params = getTestParams();

      expect(params.testMode).toBe(true);
      expect(params.seed).toBe(42);
      expect(params.skipIntro).toBe(true);
      expect(params.muteAudio).toBe(false);
      expect(params.scene).toBeUndefined();
    });

    it('should parse all parameters together', () => {
      setLocationSearch(
        '?testMode&seed=999&scene=TestLevel&muteAudio&skipIntro'
      );

      const params = getTestParams();

      expect(params).toEqual({
        testMode: true,
        seed: 999,
        scene: 'TestLevel',
        muteAudio: true,
        skipIntro: true,
      });
    });

    it('should handle parameters with equals sign but no value', () => {
      setLocationSearch('?testMode=&muteAudio=');

      const params = getTestParams();

      // Empty string is still a value, so params.has() returns true
      expect(params.testMode).toBe(true);
      expect(params.muteAudio).toBe(true);
    });

    it('should handle scene with spaces encoded', () => {
      setLocationSearch('?scene=My%20Scene%20Name');

      const params = getTestParams();

      expect(params.scene).toBe('My Scene Name');
    });

    it('should handle special characters in scene name', () => {
      setLocationSearch('?scene=Level-1_Test');

      const params = getTestParams();

      expect(params.scene).toBe('Level-1_Test');
    });

    it('should parse negative seed values', () => {
      setLocationSearch('?seed=-42');

      const params = getTestParams();

      expect(params.seed).toBe(-42);
    });

    it('should handle invalid seed as NaN', () => {
      setLocationSearch('?seed=not-a-number');

      const params = getTestParams();

      expect(params.seed).toBeNaN();
    });

    it('should handle large seed values', () => {
      setLocationSearch('?seed=2147483647');

      const params = getTestParams();

      expect(params.seed).toBe(2147483647);
    });

    it('should be case-sensitive for parameter names', () => {
      setLocationSearch('?TestMode&SCENE=test');

      const params = getTestParams();

      // These should not match (case sensitive)
      expect(params.testMode).toBe(false);
      expect(params.scene).toBeUndefined();
    });

    it('should handle duplicate parameters (first one wins)', () => {
      setLocationSearch('?seed=100&seed=200');

      const params = getTestParams();

      // URLSearchParams.get() returns the first value
      expect(params.seed).toBe(100);
    });
  });

  describe('isTestMode', () => {
    it('should return true when testMode URL parameter is present', () => {
      setLocationSearch('?testMode');

      expect(isTestMode()).toBe(true);
    });

    it('should return true when import.meta.env.MODE is test', () => {
      setLocationSearch('');
      vi.stubEnv('MODE', 'test');

      expect(isTestMode()).toBe(true);
    });

    it('should return true when both conditions are met', () => {
      setLocationSearch('?testMode');
      vi.stubEnv('MODE', 'test');

      expect(isTestMode()).toBe(true);
    });

    it('should return false when neither condition is met', () => {
      setLocationSearch('');
      vi.stubEnv('MODE', 'development');

      expect(isTestMode()).toBe(false);
    });

    it('should return false in production mode without URL parameter', () => {
      setLocationSearch('');
      vi.stubEnv('MODE', 'production');

      expect(isTestMode()).toBe(false);
    });

    it('should return true in production mode with URL parameter', () => {
      setLocationSearch('?testMode');
      vi.stubEnv('MODE', 'production');

      expect(isTestMode()).toBe(true);
    });

    it('should return true when testMode=1', () => {
      setLocationSearch('?testMode=1');

      expect(isTestMode()).toBe(true);
    });

    it('should return false when only other parameters present', () => {
      setLocationSearch('?seed=42&muteAudio');

      expect(isTestMode()).toBe(false);
    });
  });
});
