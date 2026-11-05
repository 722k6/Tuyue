import { expect, test } from '@playwright/test';
import { loginAs } from '../support/admin-session';
import { waitForApiReady } from '../support/wait-for-api';

test.describe('CMS 登录态与路由守卫（US-SYS-02）', () => {
  test.beforeEach(async ({ request }) => {
    await waitForApiReady(request);
  });

  test('未登录访问后台页面会跳到登录页并保留目标地址', async ({ page }) => {
    await page.goto('/cars/publish');
    await expect(page).toHaveURL(/\/login/);

    const url = new URL(page.url());
    expect(url.pathname).toBe('/login');
    expect(url.searchParams.get('redirect')).toBe('/cars/publish');
  });

  test('登录后回到最初访问的页面', async ({ page }) => {
    await page.goto('/cars');
    await expect(page).toHaveURL(/\/login/);

    await page.getByPlaceholder('请输入账号').fill('editor');
    await page.getByPlaceholder('请输入密码').fill('Editor@123');
    await page.getByRole('button', { name: '登录' }).click();

    await expect(page).toHaveURL(/\/cars$/);
  });

  test('退出登录后无法再进入后台', async ({ page }) => {
    await loginAs(page);
    await page.getByRole('button', { name: '退出登录' }).click();
    await expect(page).toHaveURL(/\/login$/);
    expect(await page.evaluate(() => localStorage.getItem('tuyue.admin.session'))).toBeNull();

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('编辑角色不能进入仅超管可见的管理员页', async ({ page }) => {
    await loginAs(page);
    await page.goto('/admins');

    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('已登录访问登录页会直接回到数据看板', async ({ page }) => {
    await loginAs(page);
    await page.goto('/login');

    await expect(page).toHaveURL(/\/dashboard$/);
  });
});