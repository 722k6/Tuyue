import { expect, test } from '@playwright/test';
import { API_HEALTH_URL, waitForApiReady } from '../support/wait-for-api';

/**
 * 冒烟用例：确认 E2E 环境里 Mock API 真的起来了。
 * 其他用例失败时先看这条，能快速区分「页面坏了」还是「服务没起」。
 */
test.describe('Mock API 可用性', () => {
  test.beforeAll(async ({ request }) => {
    await waitForApiReady(request);
  });

  test('健康检查返回统一响应结构', async ({ request }) => {
    const response = await request.get(API_HEALTH_URL);

    expect(response.ok()).toBeTruthy();
    const body = (await response.json()) as { success: boolean; data: { status: string } };
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('ok');
  });

  test('未知接口返回统一错误结构而不是裸 HTML', async ({ request }) => {
    // 用绝对地址：request 的 baseURL 解析会吃掉 /api 前缀
    const response = await request.get('http://127.0.0.1:3000/api/v1/definitely-not-exist');

    expect(response.status()).toBe(404);
    const contentType = response.headers()['content-type'] ?? '';
    expect(contentType).toContain('application/json');
  });
});
