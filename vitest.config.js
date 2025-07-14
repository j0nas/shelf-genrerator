import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.test.js'],
    coverage: {
      reporter: ['text', 'html'],
      include: ['js/**/*.js', 'dist/js/**/*.js'],
      exclude: ['tests/**', 'node_modules/**']
    }
  },
  esbuild: {
    target: 'node14'
  }
});