import { expect, test } from '@playwright/test';
import { loginAs } from '../support/admin-session';
import { waitForApiReady } from '../support/wait-for-api';

interface DashboardPayload {
  success: boolean;
  data: {
    totalVisits: number;
    aiUsageCount: number;
    comparisonCount: number;
    activityImpressions: number;
    popularCars: Array<{ carId: string; views: number }>;
  };
}

const EXPECTED_KPI_LABELS = ['总访问量', 'AI 使用次数', '车型对比次数', '活动曝光'];

test.describe('CMS 数据看板', () => {
  test.beforeEach(async ({ page, request }) => {
    await waitForApiReady(request);
    // US-SYS-02 起后台路由需要登录态
    await loginAs(page);
  });

  test('渲染 4 个 KPI 与热门车型列表', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page.getByRole('heading', { level: 1, name: '数据看板' })).toBeVisible();

    const kpiCards = page.locator('.kpi-card');
    await expect(kpiCards).toHaveCount(EXPECTED_KPI_LABELS.length);

    for (const [index, label] of EXPECTED_KPI_LABELS.entries()) {
      await expect(kpiCards.nth(index).locator('.kpi-card__label')).toHaveText(label);
      await expect(kpiCards.nth(index).locator('.kpi-card__value')).toHaveText(/^[\d,]+$/);
    }

    await expect(page.getByRole('heading', { level: 2, name: '热门车型' })).toBeVisible();
    await expect(page.locator('.popular-list li').first()).toBeVisible();
  });

  test('KPI 数值与 /v1/analytics/dashboard 返回一致', async ({ page }) => {
    // 登录成功后会先跳一次 /dashboard，看板这时已经请求过接口；测试里再 goto 一次，
    // 浏览器会把上一份响应体丢掉，`response.json()` 就会报
    // "Response body is not available for a response that was navigated away from"。
    // 所以在拦截层把 JSON 读出来，不依赖某一次具体响应的生命周期。
    const captured: { body: DashboardPayload | null } = { body: null };
    await page.route('**/v1/analytics/dashboard**', async (route) => {
      const response = await route.fetch();
      captured.body = (await response.json()) as DashboardPayload;
      await route.fulfill({ response });
    });

    await page.goto('/dashboard');
    await expect.poll(() => captured.body).not.toBeNull();

    const body = captured.body!;
    expect(body.success).toBe(true);

    const totalVisits = page.locator('.kpi-card').first().locator('.kpi-card__value');
    await expect(totalVisits).toHaveText(body.data.totalVisits.toLocaleString('zh-CN'));

    await expect(page.locator('.popular-list li')).toHaveCount(body.data.popularCars.length);
  });
});
