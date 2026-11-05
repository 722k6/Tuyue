import type { APIRequestContext } from '@playwright/test';

export const API_HEALTH_URL = 'http://127.0.0.1:3000/api/health';

/**
 * 等待 Mock API 就绪。
 *
 * webServer 只等前端端口，后端是随后才 listen 的，首条请求可能撞上 ECONNREFUSED。
 * 这里做带退避的重试，避免用例偶发失败（CI 上尤其明显）。
 * 用绝对地址，因为这个 fixture 的 baseURL 是前端地址，不含后端。
 */
export async function waitForApiReady(context: APIRequestContext, timeout = 30_000): Promise<void> {
  const deadline = Date.now() + timeout;
  let lastError = '';

  while (Date.now() < deadline) {
    try {
      const response = await context.get(API_HEALTH_URL, { timeout: 2_000 });
      if (response.ok()) return;
      lastError = `HTTP ${response.status()}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message.split('\n')[0] : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  throw new Error(`Mock API 在 ${timeout}ms 内未就绪：${lastError}`);
}
