import { expect, test } from '@playwright/test';
import { loginAs } from '../support/admin-session';
import { waitForApiReady } from '../support/wait-for-api';

/**
 * BUG-CAR10-01（US-CAR-10 车型基础 CRUD）回归：
 * 列表空态要区分「车型库为空」和「筛选条件无匹配」，不能一律提示「暂无车型」。
 */
test.describe('CMS 车型列表空态', () => {
  test.beforeEach(async ({ page, request }) => {
    await waitForApiReady(request);
    // 后台路由需要登录态（US-SYS-02）
    await loginAs(page);
  });

  test('筛选无结果时提示「没有匹配的车型」，重置后恢复列表', async ({ page }) => {
    await page.goto('/cars');
    await expect(page.getByRole('heading', { level: 1, name: '车型管理' })).toBeVisible();
    await expect(page.locator('.el-table__row').first()).toBeVisible();

    // BUG-CAR10-01 原始复现步骤
    await page.getByPlaceholder('搜索车型名称 / 系列 / 卖点').fill('不存在的车型XYZ');
    await page.getByRole('button', { name: '查询', exact: true }).click();

    await expect(page.getByText('没有匹配的车型')).toBeVisible();
    await expect(page.getByText('暂无车型，点击右上角新增')).toHaveCount(0);

    // 边界：只改输入框、不点查询时筛选条件尚未生效，空态不能跳回「暂无车型」
    await page.getByPlaceholder('搜索车型名称 / 系列 / 卖点').fill('');
    await expect(page.getByText('没有匹配的车型')).toBeVisible();

    await page.getByRole('button', { name: '重置', exact: true }).click();
    await expect(page.locator('.el-table__row').first()).toBeVisible();
  });

  test('无筛选且车型库为空时仍提示「暂无车型，点击右上角新增」', async ({ page }) => {
    // 用接口 mock 造「库里真的没有车」，避免删除种子数据影响其他并行用例
    await page.route(/\/v1\/admin\/cars\/search\?/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { items: [], page: 1, pageSize: 10, total: 0 },
        }),
      });
    });

    await page.goto('/cars');
    await expect(page.getByText('暂无车型，点击右上角新增')).toBeVisible();
    await expect(page.getByText('没有匹配的车型')).toHaveCount(0);
  });
});
