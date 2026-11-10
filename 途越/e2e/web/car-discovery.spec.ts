import { expect, test } from '@playwright/test';
import { waitForApiReady } from '../support/wait-for-api';

test.describe('US-CAR-03 / US-SRC-01 车型筛选、排序与关键词搜索', () => {
  test.beforeEach(async ({ request }) => {
    await waitForApiReady(request);
  });

  test('组合筛选与排序写入 URL，刷新后条件和结果保持', async ({ page }) => {
    await page.goto('/cars');
    await page.getByLabel('能源类型').selectOption('electric');
    await page.getByLabel('车身形式').selectOption('sedan');
    await page.getByLabel('最低价（万元）').fill('20');
    await page.getByLabel('最高价（万元）').fill('25');
    await page.getByLabel('排序').selectOption('price-asc');
    await page.getByRole('button', { name: '筛选 / 搜索' }).click();

    await expect(page).toHaveURL(/energyType=electric/);
    await expect(page).toHaveURL(/bodyStyle=sedan/);
    await expect(page).toHaveURL(/minPrice=20/);
    await expect(page).toHaveURL(/maxPrice=25/);
    await expect(page).toHaveURL(/sort=price-asc/);
    await expect(page.locator('.car-card')).toHaveCount(1);

    await page.reload();
    await expect(page.getByLabel('能源类型')).toHaveValue('electric');
    await expect(page.getByLabel('车身形式')).toHaveValue('sedan');
    await expect(page.getByLabel('最低价（万元）')).toHaveValue('20');
    await expect(page.getByLabel('最高价（万元）')).toHaveValue('25');
    await expect(page.getByLabel('排序')).toHaveValue('price-asc');
    await expect(page.locator('.car-card')).toHaveCount(1);

    await page.getByRole('button', { name: '清空条件' }).click();
    await expect(page).toHaveURL(/\/cars$/);
    await expect(page.locator('.car-card')).toHaveCount(4);
  });

  test('参数关键词命中车型，无结果时给出调整条件的引导', async ({ page }) => {
    await page.goto('/cars');
    await page.getByLabel('关键词').fill('620');
    await page.getByRole('button', { name: '筛选 / 搜索' }).click();
    await expect(page).toHaveURL(/keyword=620/);
    await expect(page.locator('.car-card')).toHaveCount(1);
    await expect(page.getByRole('link', { name: '查看车型详情' })).toBeVisible();
    await expect(page.getByRole('button', { name: '加入对比' })).toBeVisible();

    await page.getByLabel('关键词').fill('不存在的车型');
    await page.getByRole('button', { name: '筛选 / 搜索' }).click();
    await expect(page.getByRole('heading', { name: '没有找到匹配车型' })).toBeVisible();
    await expect(page.getByText('请尝试缩短关键词')).toBeVisible();
  });
});
