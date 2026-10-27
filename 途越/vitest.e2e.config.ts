import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['apps/**/*.e2e-spec.ts'],
    testTimeout: 10_000,
  },
});
