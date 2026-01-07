import { describe, it, expect } from 'vitest';

import { APP_CONFIG } from '@app/config';

describe('Application configuration', () => {
  it('should have correct dimensions', () => {
    expect(APP_CONFIG.width).toBe(1024);
    expect(APP_CONFIG.height).toBe(768);
  });

  it('should have a background color', () => {
    expect(APP_CONFIG.backgroundColor).toBe(0x1a1a2e);
  });

  it('should have antialias enabled', () => {
    expect(APP_CONFIG.antialias).toBe(true);
  });
});
