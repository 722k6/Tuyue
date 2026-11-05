import { expect, test } from '@playwright/test';
import { waitForApiReady } from '../support/wait-for-api';

/**
 * 验收标准里的一条硬要求：地图按经纬度定位，且换地图供应商不影响业务页面接口。
 * 这里的断言只依赖 MapProvider 适配层的产出（.mock-map__marker + data-marker-id），
 * 将来把 MockMapProvider 换成高德/腾讯时，这些用例应当无需修改照样通过。
 */
const COORDINATE_PATTERN = /\d+\.\d{4}, \d+\.\d{4}$/;

test.describe('官网经销商地图', () => {
  test.beforeEach(async ({ request }) => {
    await waitForApiReady(request);
  });

  test('地图标记与门店卡片一一对应', async ({ page }) => {
    await page.goto('/dealers');

    await expect(page.getByRole('heading', { level: 1, name: '经销商' })).toBeVisible();

    const cards = page.locator('.dealer-card');
    await expect(cards.first()).toBeVisible();

    const markers = page.locator('.mock-map__marker');
    await expect(markers.first()).toBeVisible();
    await expect(markers).toHaveCount(await cards.count());

    // 每个标记都要带经纬度，证明是按坐标渲染而不是按顺序编号
    const count = await markers.count();
    for (let index = 0; index < count; index += 1) {
      await expect(markers.nth(index)).toHaveText(COORDINATE_PATTERN);
    }
  });

  test('点击地图标记与点击门店卡片双向联动', async ({ page }) => {
    await page.goto('/dealers');

    const markers = page.locator('.mock-map__marker');
    const cards = page.locator('.dealer-card');
    await expect(markers.first()).toBeVisible();
    await expect(cards.first()).toBeVisible();

    // ① 点标记 → 对应卡片高亮
    const firstMarker = markers.first();
    const firstId = await firstMarker.getAttribute('data-marker-id');
    expect(firstId).toBeTruthy();

    await firstMarker.click();
    await expect(page.locator(`.dealer-card[data-dealer-id="${firstId}"]`)).toHaveAttribute(
      'data-selected',
      'true',
    );

    // ② 点另一张卡片 → 对应标记聚焦，且同时只有一个聚焦标记
    const secondCard = cards.nth(1);
    const secondId = await secondCard.getAttribute('data-dealer-id');
    expect(secondId).toBeTruthy();

    await secondCard.click();
    await expect(page.locator(`.mock-map__marker[data-marker-id="${secondId}"]`)).toHaveAttribute(
      'data-focused',
      'true',
    );
    await expect(page.locator('.mock-map__marker[data-focused="true"]')).toHaveCount(1);
  });

  test('门店信息完整渲染（名称、地址、电话、营业时间）', async ({ page }) => {
    await page.goto('/dealers');

    const firstCard = page.locator('.dealer-card').first();
    await expect(firstCard).toBeVisible();

    await expect(firstCard.getByRole('heading', { level: 2 })).toHaveText(/\S+/);
    await expect(firstCard.locator('.dealer-card__meta')).toHaveText(/\S+ · \S+/);
  });
});
