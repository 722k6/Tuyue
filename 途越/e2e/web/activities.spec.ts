import { expect, test } from '@playwright/test';
import { waitForApiReady } from '../support/wait-for-api';

interface ActivityPayload {
  success: boolean;
  data: Array<{ id: string; name: string; startsAt: string; endsAt: string; published: boolean }>;
}

const RANGE_PATTERN = /^\d{4}\/\d{2}\/\d{2} - \d{4}\/\d{2}\/\d{2}$/;

test.describe('官网活动列表', () => {
  test.beforeEach(async ({ request }) => {
    await waitForApiReady(request);
  });

  test('页面渲染活动卡片，含日期区间与发布状态', async ({ page }) => {
    await page.goto('/activities');

    await expect(page.getByRole('heading', { level: 1, name: '品牌活动' })).toBeVisible();

    const cards = page.locator('.activity-card');
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThan(0);

    const first = cards.first();
    await expect(first.getByRole('heading', { level: 2 })).toHaveText(/\S+/);
    await expect(first.locator('.activity-card__range')).toHaveText(RANGE_PATTERN);
    await expect(first.locator('.activity-card__status')).toHaveText(/已发布|未发布/);
  });

  test('卡片内容来自 /v1/activities 接口，而不是写死在前端', async ({ page }) => {
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/v1/activities') && response.request().method() === 'GET',
    );

    await page.goto('/activities');

    const response = await responsePromise;
    expect(response.ok()).toBeTruthy();

    const body = (await response.json()) as ActivityPayload;
    expect(body.success).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);

    const firstCard = page.locator('.activity-card').first();
    await expect(firstCard.getByRole('heading', { level: 2 })).toHaveText(body.data[0].name);
  });
});
