import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{js,ts}'],
    coverage: {
      reporter: ['text', 'html'],
      include: ['js/**/*.ts', 'dist/js/**/*.js'],
      exclude: ['tests/**', 'node_modules/**', '**/*.d.ts']
    }
  },
  esbuild: {
    target: 'node14'
  }
});