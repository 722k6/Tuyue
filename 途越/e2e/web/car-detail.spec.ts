import { expect, test, type Page } from '@playwright/test';
import { waitForApiReady } from '../support/wait-for-api';

/** 1×1 透明 PNG：让图集用例能真实走「图片加载成功」的分支，不依赖 public 下有没有素材。 */
const PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

async function stubCarImages(page: Page): Promise<void> {
  await page.route('**/mock/cars/**', (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL_PNG }),
  );
}

/**
 * US-CAR-02 前台车型详情。
 *
 * 覆盖验收要点：基础信息、图集轮播、参数分组展示、不存在/已下架返回 404 占位。
 */
test.describe('官网车型详情', () => {
  test.beforeEach(async ({ request }) => {
    await waitForApiReady(request);
  });

  test('从列表点进详情，基础信息与接口数据一致', async ({ page }) => {
    await page.goto('/cars');
    await page
      .locator('.car-card[data-car-id="ty-suv-001"]')
      .getByRole('link', { name: '查看车型详情' })
      .click();

    await expect(page).toHaveURL(/\/cars\/ty-suv-001$/);
    await expect(page.getByRole('heading', { level: 1, name: '途越远行' })).toBeVisible();
    await expect(page.locator('.car-detail__tagline')).toHaveText('从容应对每一段旅程');
    await expect(page.locator('.car-detail__price')).toContainText('18.99–23.99 万');

    const facts = page.locator('.car-detail__facts');
    await expect(facts).toContainText('汽油');
    await expect(facts).toContainText('远行系列');
  });

  test('图集可以左右切换，计数随之变化', async ({ page }) => {
    await stubCarImages(page);
    await page.goto('/cars/ty-suv-001');

    const counter = page.locator('.gallery__counter');
    await expect(counter).toHaveText('1 / 2');

    await page.getByRole('button', { name: '下一张' }).click();
    await expect(counter).toHaveText('2 / 2');

    // 最后一张再往后回到第一张，不会卡在边界
    await page.getByRole('button', { name: '下一张' }).click();
    await expect(counter).toHaveText('1 / 2');

    await page.getByRole('button', { name: '上一张' }).click();
    await expect(counter).toHaveText('2 / 2');

    // 缩略图直接跳转
    await page.locator('.gallery__thumb[data-index="0"]').click();
    await expect(counter).toHaveText('1 / 2');
  });

  test('图片加载失败时降级为占位块，不出现破图', async ({ page }) => {
    // 主动掐断图片请求，模拟 CMS 图还没传或图挂了
    await page.route('**/mock/cars/**', (route) => route.abort());
    await page.goto('/cars/ty-suv-001');

    await expect(page.locator('.gallery__stage--empty')).toBeVisible();
    await expect(page.locator('.gallery__counter')).toHaveCount(0);
  });

  test('参数按分组展示，顺序与对比表一致', async ({ page }) => {
    await page.goto('/cars/ty-suv-001');

    const groups = page.locator('.parameter-group');
    await expect(groups).toHaveCount(4);
    await expect(page.locator('.parameter-group__title')).toHaveText(['动力', '尺寸', '安全', '智能']);

    const power = page.locator('.parameter-group[data-group="power"]');
    await expect(power.locator('.parameter-row[data-code="power"]')).toContainText('185');
    await expect(power.locator('.parameter-row[data-code="power"]')).toContainText('kW');
  });

  test('已下架车型返回 404 占位页而不是空白或报错', async ({ page }) => {
    await page.goto('/cars/ty-legacy-001');

    await expect(page.locator('.car-detail__code')).toHaveText('404');
    await expect(page.getByRole('heading', { level: 1, name: '车型不存在或已下架' })).toBeVisible();
    await expect(page.getByRole('link', { name: '看看其他在售车型' })).toBeVisible();
  });

  test('不存在的地址走兜底 404 页面', async ({ page }) => {
    await page.goto('/this-page-does-not-exist');

    await expect(page.getByRole('heading', { level: 1, name: '页面不存在' })).toBeVisible();
  });
});
