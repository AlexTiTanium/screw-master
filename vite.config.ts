import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { bugReportPlugin } from './vite/plugins/bugReportPlugin';

export default defineConfig({
  plugins: [bugReportPlugin()],
  base: process.env.VITE_BASE_PATH || '/',
  root: 'src',
  publicDir: resolve(__dirname, 'assets'),
  resolve: {
    alias: {
      '@app': resolve(__dirname, 'src/app'),
      '@scenes': resolve(__dirname, 'src/scenes'),
      '@ui': resolve(__dirname, 'src/ui'),
      '@shared': resolve(__dirname, 'src/shared'),
    },
  },
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    target: 'esnext',
    sourcemap: true,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          pixi: ['pixi.js', '@pixi/sound', '@pixi/ui'],
          vendor: ['gsap', 'typed-signals'],
        },
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  preview: {
    port: 4173,
  },
});
