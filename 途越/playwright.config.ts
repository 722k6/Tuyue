import { defineConfig, devices } from '@playwright/test';

/**
 * 浏览器 E2E 配置（运营能力及质量发布责任线）
 *
 * 两套地址，别混用：
 * - BROWSER_*：浏览器访问的地址，必须是 localhost。后端 CORS 白名单只放行
 *   http://localhost:5173 / http://localhost:5174（见 packages/config 的 parseCorsOrigins），
 *   换成 127.0.0.1 会让前端 fetch 被浏览器拦掉。
 * - CHECK_*：Node 侧的就绪探测地址，必须是 127.0.0.1。Playwright 的探测走 IPv4，
 *   而 vite 默认只解析到 IPv6 ::1，两者对不上会一直等到超时。
 *   所以 apps/web、apps/admin 的 vite.config.ts 里固定了 host: '127.0.0.1'。
 */
const BROWSER_WEB_URL = 'http://localhost:5173';
const BROWSER_ADMIN_URL = 'http://localhost:5174';

const CHECK_API_URL = 'http://127.0.0.1:3000/api';
const CHECK_WEB_URL = 'http://127.0.0.1:5173';

const isCi = Boolean(process.env.CI);
const reuseExistingServer = !isCi;

/**
 * 浏览器来源：
 * - 本地：直接驱动系统已安装的 Chrome，不下载 Playwright 自带内核（省 150MB）。
 *   机器上没装 Chrome 的话改成 'msedge'，或执行一次 `pnpm e2e:install`。
 * - CI：用 `playwright install` 装好的 chromium，不依赖 runner 预装什么。
 */
const browserChannel = isCi ? undefined : ('chrome' as const);

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  fullyParallel: true,
  forbidOnly: isCi,
  retries: isCi ? 2 : 0,
  workers: isCi ? 2 : undefined,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
  },

  projects: [
    {
      name: 'web',
      testMatch: '**/web/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'], baseURL: BROWSER_WEB_URL, channel: browserChannel },
    },
    {
      name: 'admin',
      testMatch: '**/admin/**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: BROWSER_ADMIN_URL,
        channel: browserChannel,
      },
    },
    {
      name: 'api',
      testMatch: '**/api/**/*.spec.ts',
      use: { baseURL: CHECK_API_URL },
    },
  ],

  /**
   * 只用一个条目跑 `pnpm dev`（它内部 --parallel 起 api/web/admin 三个应用）。
   * 拆成三个条目在本机会失败：Playwright 并发拉起多个 pnpm 子进程时第三条起不来，
   * 表现是「Timed out waiting 120000ms from config.webServer」，排查成本很高。
   * 三个应用由 pnpm 自己编排，反而更稳。
   */
  webServer: {
    command: 'pnpm dev',
    url: CHECK_WEB_URL,
    reuseExistingServer,
    timeout: 180_000,
  },
});
