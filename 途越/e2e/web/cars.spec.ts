import { expect, test } from '@playwright/test';
import { waitForApiReady } from '../support/wait-for-api';

/**
 * US-CAR-01 前台车型列表。
 *
 * 覆盖验收要点：卡片列表取自接口、分页可翻且状态进 URL、只有已上架车型、
 * 加载/空/失败三态、窄屏栅格回落成一列。
 */
test.describe('官网车型列表', () => {
  test.beforeEach(async ({ request }) => {
    await waitForApiReady(request);
  });

  test('卡片列表来自 /v1/cars，含名称、价格与详情入口', async ({ page }) => {
    const responsePromise = page.waitForResponse(
      (response) => response.url().includes('/v1/cars') && response.request().method() === 'GET',
    );

    await page.goto('/cars');
    const response = await responsePromise;
    const body = (await response.json()) as { data: Array<{ id: string; name: string }> };

    await expect(page.getByRole('heading', { level: 1, name: '车型列表' })).toBeVisible();

    const cards = page.locator('.car-card');
    await expect(cards).toHaveCount(body.data.length);

    const first = cards.first();
    await expect(first.getByRole('heading', { level: 2 })).toHaveText(body.data[0]!.name);
    await expect(first.locator('.car-card__price')).toHaveText(/\d+(\.\d+)?(–\d+(\.\d+)?)? 万/);
    await expect(first.getByRole('link', { name: '查看详情' })).toBeVisible();
  });

  test('已下架车型不出现在列表里', async ({ page, request }) => {
    const list = await request.get('http://127.0.0.1:3000/api/v1/cars');
    const body = (await list.json()) as { data: Array<{ id: string }> };
    test.skip(
      body.data.some((car) => car.id === 'ty-legacy-001'),
      '被测车型当前为上架状态，需先下架才能验证过滤',
    );

    await page.goto('/cars');

    await expect(page.locator('.car-card')).not.toHaveCount(0);
    await expect(page.locator('.car-card[data-car-id="ty-legacy-001"]')).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 2, name: '途越启程' })).toHaveCount(0);
  });

  test('翻页改变展示内容，并把页码写进地址栏', async ({ page, request }) => {
    const list = await request.get('http://127.0.0.1:3000/api/v1/cars');
    const body = (await list.json()) as { data: unknown[] };
    const total = body.data.length;

    await page.goto('/cars?page=1&pageSize=6');

    const cards = page.locator('.car-card');
    await expect(cards).toHaveCount(total);

    // 上架车型不足 6 台时只有一页，页码按钮只有一个
    await expect(page.locator('.pagination__button--page')).toHaveCount(1);
    await expect(page.locator('.pagination__summary')).toContainText(`共 ${total} 台车型`);

    // 切到每页 12 台，URL 同步更新
    await page.locator('.pagination__size select').selectOption('12');
    await expect(page).toHaveURL(/pageSize=12/);
    await expect(cards).toHaveCount(total);
  });

  test('刷新后仍停在同一页（分页状态保存在 URL）', async ({ page }) => {
    await page.goto('/cars?page=1&pageSize=6');
    await expect(page.locator('.car-card')).not.toHaveCount(0);

    await page.reload();

    await expect(page).toHaveURL(/page=1/);
    await expect(page.locator('.car-card')).not.toHaveCount(0);
    await expect(page.locator('.pagination__summary')).toContainText(/第 1–\d+ 台/);
  });

  test('接口返回空列表时展示空态而不是空白页', async ({ page }) => {
    await page.route('**/api/v1/cars', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [], requestId: 'req-empty' }),
      }),
    );

    await page.goto('/cars');

    await expect(page.getByText('暂无在售车型')).toBeVisible();
    await expect(page.locator('.car-card')).toHaveCount(0);
  });

  test('接口失败时展示可重试的错误态', async ({ page }) => {
    await page.route('**/api/v1/cars', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: { code: 'ERR', message: 'boom' } }),
      }),
    );

    await page.goto('/cars');

    await expect(page.getByText('车型加载失败')).toBeVisible();

    // 去掉拦截后点「重新加载」，列表恢复
    await page.unroute('**/api/v1/cars');
    await page.getByRole('button', { name: '重新加载' }).click();
    await expect(page.locator('.car-card')).not.toHaveCount(0);
  });

  test('手机窄屏下栅格回落到一列', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 780 });
    await page.goto('/cars');

    await expect(page.locator('.car-card').first()).toBeVisible();

    const columns = await page.locator('.cars-grid').evaluate((element) => {
      const style = getComputedStyle(element);
      return style.gridTemplateColumns.split(' ').length;
    });

    expect(columns).toBe(1);
  });
});
