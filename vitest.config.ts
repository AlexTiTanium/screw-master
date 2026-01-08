import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/**/index.ts'],
    },
    typecheck: {
      enabled: true,
    },
  },
  resolve: {
    alias: {
      '@app': resolve(__dirname, 'src/app'),
      '@scenes': resolve(__dirname, 'src/scenes'),
      '@ui': resolve(__dirname, 'src/ui'),
      '@shared': resolve(__dirname, 'src/shared'),
    },
  },
});
