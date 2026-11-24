import { expect, type APIRequestContext, type Page } from '@playwright/test';

const API_BASE = 'http://127.0.0.1:3000/api';

/** 直接调后台接口的用例要先拿 Token（issue #26 起 /api/v1/admin/** 强制鉴权）。 */
export async function loginToken(
  request: APIRequestContext,
  username = 'editor',
  password = 'Editor@123',
): Promise<string> {
  const response = await request.post(`${API_BASE}/v1/auth/login`, {
    data: { username, password },
  });
  expect(response.ok()).toBe(true);
  const body = (await response.json()) as { data: { accessToken: string } };
  return body.data.accessToken;
}

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
