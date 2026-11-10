import { expect, test } from '@playwright/test';

const SESSION_KEY = 'tuyue.admin.session';
const USERNAME_KEY = 'tuyue.admin.username';

test.describe('CMS 后台登录（US-SYS-01）', () => {
  test('账号密码正确时签发 Token 并进入数据看板', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('请输入账号').fill('editor');
    await page.getByPlaceholder('请输入密码').fill('Editor@123');
    await page.getByRole('button', { name: '登录' }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect
      .poll(() => page.evaluate((key) => localStorage.getItem(key), USERNAME_KEY))
      .toBe('editor');

    const session = await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as { accessToken: string }) : null;
    }, SESSION_KEY);
    expect(session?.accessToken.split('.')).toHaveLength(3);
  });

  test('密码错误时停留登录页并显示错误提示', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('请输入账号').fill('editor');
    await page.getByPlaceholder('请输入密码').fill('wrong-password');
    await page.getByRole('button', { name: '登录' }).click();

    await expect(page.getByRole('alert')).toContainText('账号或密码错误');
    await expect(page).toHaveURL(/\/login$/);
    expect(await page.evaluate((key) => localStorage.getItem(key), SESSION_KEY)).toBeNull();
  });

  test('未填账号密码时前端直接提示，不发请求', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: '登录' }).click();

    await expect(page.getByRole('alert')).toContainText('请输入账号和密码');
    await expect(page).toHaveURL(/\/login$/);
  });
});