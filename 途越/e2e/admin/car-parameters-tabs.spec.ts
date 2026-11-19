import { expect, test } from '@playwright/test';
import { loginAs } from '../support/admin-session';
import { waitForApiReady } from '../support/wait-for-api';

/**
 * BUG-CAR-07（US-CAR-12 车型参数管理）回归：
 * 参数抽屉必须渲染 5 个分组标签，点击标签只显示当前分组，「新增参数」作用于当前分组。
 */
test.describe('CMS 参数抽屉分组标签', () => {
  test.beforeEach(async ({ page, request }) => {
    await waitForApiReady(request);
    await loginAs(page, 'admin', 'Admin@123');
  });

  test('5 个分组标签可切换，新增参数作用于当前分组', async ({ page }) => {
    await page.goto('/cars');

    const row = page.getByRole('row', { name: /途越远行/ });
    await expect(row).toHaveCount(1);
    await row.getByRole('button', { name: '参数' }).click();

    const drawer = page.locator('.el-drawer').filter({ hasText: '车型参数' });
    await expect(drawer).toBeVisible();

    // 标签栏渲染，带参数条数，默认停在第一个分组
    const tabs = drawer.locator('.el-tabs__item');
    await expect(tabs).toHaveCount(5);
    await expect(tabs.filter({ hasText: '动力' })).toHaveClass(/is-active/);

    // 切换标签只显示当前分组
    await drawer.locator('.el-tabs__item', { hasText: '尺寸' }).click();
    await expect(tabs.filter({ hasText: '尺寸' })).toHaveClass(/is-active/);
    await expect(drawer.locator('.el-tab-pane:visible')).toHaveCount(1);

    // 「新增参数」落到当前分组：尺寸组参数 +1，其它分组不变
    await expect(tabs.filter({ hasText: '尺寸' })).toContainText('尺寸（3）');
    await drawer.getByRole('button', { name: '新增参数' }).click();
    await expect(tabs.filter({ hasText: '尺寸' })).toContainText('尺寸（4）');
    await expect(tabs.filter({ hasText: '动力' })).toContainText('动力（4）');
  });
});
