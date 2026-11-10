import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: { reporter: ['text'] },
    // vitest 5 移除了 environmentMatchGlobs，按项目区分运行环境
    projects: [
      {
        test: {
          name: 'node',
          include: ['apps/api/**/*.spec.ts', 'packages/**/*.spec.ts'],
          exclude: ['**/node_modules/**', '**/dist/**', '**/*.e2e-spec.ts'],
        },
      },
      {
        test: {
          name: 'dom',
          include: ['apps/{web,admin}/**/*.spec.ts'],
          exclude: ['**/node_modules/**', '**/dist/**'],
          environment: 'jsdom',
        },
      },
    ],
  },
});