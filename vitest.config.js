import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: '.',
  css: {
    postcss: {
      plugins: [],
    },
  },
  test: {
    globals: false,
    environment: 'node',
    include: ['test/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.js'],
      exclude: ['src/index.js'],
    },
  },
});


