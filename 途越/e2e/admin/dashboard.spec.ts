import { expect, test } from '@playwright/test';
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
    // 后台路由守卫读取真实登录态，E2E 直接注入一个未过期的超管会话
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'tuyue.admin.session',
        JSON.stringify({
          accessToken: 'e2e-local-token',
          expiresAt: '2099-01-01T00:00:00.000Z',
          user: {
            id: 'e2e',
            username: 'e2e',
            displayName: 'E2E',
            role: 'super_admin',
            permissions: [],
          },
        }),
      );
      window.localStorage.setItem('tuyue.admin.username', 'e2e');
    });
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
    const responsePromise = page.waitForResponse(
      (response) => response.url().includes('/v1/analytics/dashboard') && response.ok(),
    );

    await page.goto('/dashboard');

    const body = (await (await responsePromise).json()) as DashboardPayload;
    expect(body.success).toBe(true);

    const totalVisits = page.locator('.kpi-card').first().locator('.kpi-card__value');
    await expect(totalVisits).toHaveText(body.data.totalVisits.toLocaleString('zh-CN'));

    await expect(page.locator('.popular-list li')).toHaveCount(body.data.popularCars.length);
  });
});
