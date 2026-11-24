import { expect, test } from '@playwright/test';
import { loginAs } from '../support/admin-session';
import { waitForApiReady } from '../support/wait-for-api';

/**
 * US-SYS-03 后台布局外壳：侧边栏 + 面包屑 + 窄屏抽屉。
 *
 * 面包屑读的是路由 meta.title，所以这里顺带验证「换页面 → 面包屑跟着变」，
 * 避免以后新增页面忘了补标题导致面包屑停在上一级。
 */
test.describe('CMS 布局外壳', () => {
  test.beforeEach(async ({ page, request }) => {
    await waitForApiReady(request);
    await loginAs(page);
  });

  test('面包屑显示当前页面层级，并随路由变化', async ({ page }) => {
    const crumbs = page.locator('.topbar__crumbs');

    await expect(crumbs).toContainText('首页');
    await expect(crumbs).toContainText('数据看板');

    await page.locator('.cms-menu').getByText('车型管理', { exact: true }).click();
    await expect(page).toHaveURL(/\/cars$/);
    await expect(crumbs).toContainText('车型管理');

    await page.locator('.cms-menu').getByText('车型上下架', { exact: true }).click();
    await expect(page).toHaveURL(/\/cars\/publish$/);
    await expect(crumbs).toContainText('车型上下架');
  });

  test('窄屏下侧边栏收成抽屉，点菜单后自动关闭', async ({ page }) => {
    await page.setViewportSize({ width: 420, height: 800 });
    await page.reload();

    const aside = page.locator('.cms-aside');
    const menuButton = page.getByRole('button', { name: '打开导航菜单' });
    await expect(menuButton).toBeVisible();

    // 默认在视口外
    const beforeOpen = await aside.evaluate((element) => element.getBoundingClientRect().right);
    expect(beforeOpen).toBeLessThanOrEqual(0);

    await menuButton.click();
    await expect
      .poll(() => aside.evaluate((element) => element.getBoundingClientRect().left))
      .toBe(0);

    await page.locator('.cms-menu').getByText('车型管理', { exact: true }).click();
    await expect(page).toHaveURL(/\/cars$/);

    // 跳转后抽屉关闭，指回视口外
    await expect
      .poll(() => aside.evaluate((element) => element.getBoundingClientRect().right))
      .toBeLessThanOrEqual(0);
  });
});
