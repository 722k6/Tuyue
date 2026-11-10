import { expect, type Page } from '@playwright/test';

export async function loginAs(
  page: Page,
  username = 'editor',
  password = 'Editor@123',
): Promise<void> {
  await page.goto('/login');
  await page.getByPlaceholder('请输入账号').fill(username);
  await page.getByPlaceholder('请输入密码').fill(password);
  await page.getByRole('button', { name: '登录' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}
