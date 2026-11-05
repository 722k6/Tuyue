import { expect, test } from '@playwright/test';
import { waitForApiReady } from '../support/wait-for-api';

const API_BASE = 'http://127.0.0.1:3000/api';
const WEB_BASE = 'http://localhost:5173';

/**
 * US-CAR-13 车型上下架。
 *
 * 固定拿 `ty-legacy-001`（种子数据里本来就是已下线）做被测对象：
 * 上架 → 官网可见 → 下架 → 官网消失，最后回到已下线，前后状态一致，
 * 不会把其他并行用例依赖的在售车型改坏。
 */
test.describe('CMS 车型上下架', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page, request }) => {
    await waitForApiReady(request);
    // 后台路由守卫要求本地登录态，E2E 直接注入超管角色
    await page.addInitScript(() => {
      window.localStorage.setItem('tuyue.admin.role', 'super_admin');
      window.localStorage.setItem('tuyue.admin.username', 'e2e');
    });
    // 前置：确保被测车型处于已下线状态（上一次失败运行可能留下脏状态）
    await request.post(`${API_BASE}/v1/admin/cars/ty-legacy-001/status`, {
      data: { action: 'offline', reason: '回归前置' },
    });
  });

  test('上架后官网可见，下架后官网消失，操作留痕可追溯', async ({ page, request }) => {
    await page.goto('/cars/publish');
    await expect(page.getByRole('heading', { level: 1, name: '车型上下架' })).toBeVisible();

    const row = page.locator('.el-table__row').filter({ hasText: '途越启程' });
    await expect(row).toBeVisible();
    await expect(row.locator('.el-tag')).toHaveText('已下架');

    // ① 上架
    await row.getByRole('button', { name: '上架' }).click();
    await page.locator('.el-message-box').getByRole('button', { name: '上架' }).click();
    await expect(row.locator('.el-tag')).toHaveText('已上架');

    // ② 官网立刻能看到
    await page.goto(`${WEB_BASE}/cars`);
    await expect(page.getByRole('heading', { level: 2, name: '途越启程' })).toBeVisible();

    // ③ 回后台下架，必须填原因
    await page.goto('/cars/publish');
    const rowAgain = page.locator('.el-table__row').filter({ hasText: '途越启程' });
    await rowAgain.getByRole('button', { name: '下架' }).click();
    await page.getByPlaceholder('例如：改款停产 / 价格调整中').fill('Sprint3 回归测试');
    await page.locator('.el-message-box').getByRole('button', { name: '确认下架' }).click();
    await expect(rowAgain.locator('.el-tag')).toHaveText('已下架');

    // ④ 官网随之消失，接口层面也不再返回
    await page.goto(`${WEB_BASE}/cars`);
    await expect(page.getByRole('heading', { level: 2, name: '途越启程' })).toHaveCount(0);

    const publicList = await request.get(`${API_BASE}/v1/cars`);
    const publicBody = (await publicList.json()) as { data: Array<{ id: string }> };
    expect(publicBody.data.map((car) => car.id)).not.toContain('ty-legacy-001');

    await request.get(`${API_BASE}/v1/cars/ty-legacy-001`).then((response) => {
      expect(response.status()).toBe(404);
    });

    // ⑤ 留痕记录两次操作，且带操作人与下架原因
    await page.goto('/cars/publish');
    const rowForLogs = page.locator('.el-table__row').filter({ hasText: '途越启程' });
    await rowForLogs.getByRole('button', { name: /条$/ }).click();
    await expect(page.getByRole('heading', { name: '操作留痕' })).toBeVisible();
    await expect(page.locator('.el-dialog .el-table__row')).toHaveCount(2);
    await expect(page.locator('.el-dialog')).toContainText('Sprint3 回归测试');
  });

  test('筛选与搜索能定位到已下架车型', async ({ page }) => {
    await page.goto('/cars/publish');
    await expect(page.locator('.car-table')).toBeVisible();

    await page.getByPlaceholder('搜索车型 / 系列').fill('启程');
    await expect(page.locator('.el-table__row')).toHaveCount(1);
    await expect(page.locator('.el-table__row')).toContainText('途越启程');

    await page.getByPlaceholder('搜索车型 / 系列').fill('不存在的车型');
    await expect(page.getByText('没有符合条件的车型')).toBeVisible();
  });
});
