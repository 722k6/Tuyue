import { expect, test } from '@playwright/test';
import { loginAs, loginToken } from '../support/admin-session';
import { waitForApiReady } from '../support/wait-for-api';

const API_BASE = 'http://127.0.0.1:3000/api';
const CAR_NAME = '审核记录回归车';

/**
 * BUG-ADM02-04 回归：编辑在 /cars 必须能看到驳回意见。
 *
 * 全程用专用车型避免与其他用例抢 ty-legacy-001：
 * editor 建草稿 → 提交审核 → reviewer 驳回并留言 → editor 在列表点「审核记录」看到意见全文。
 */
test('编辑在车型列表能看到最近一次驳回意见（BUG-ADM02-04）', async ({ page, request }) => {
  await waitForApiReady(request);
  const editorToken = await loginToken(request, 'editor');
  const reviewerToken = await loginToken(request, 'reviewer', 'Reviewer@123');
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  const created = await request.post(`${API_BASE}/v1/admin/cars`, {
    headers: auth(editorToken),
    data: {
      name: CAR_NAME,
      series: '回归系列',
      energyType: 'electric',
      tagline: '用于验证驳回意见可见性',
      description: '该车型由 e2e 自动创建，用于验证编辑端能看到审核驳回意见，用例结束即删除。',
      priceMinCents: 19_990_000,
      priceMaxCents: 26_990_000,
      publishStatus: 'draft',
    },
  });
  expect(created.ok()).toBe(true);
  const carId = ((await created.json()) as { data: { id: string } }).data.id;

  try {
    const submitted = await request.post(`${API_BASE}/v1/admin/cars/${carId}/review`, {
      headers: auth(editorToken),
      data: { action: 'submit' },
    });
    expect(submitted.ok()).toBe(true);

    const rejected = await request.post(`${API_BASE}/v1/admin/cars/${carId}/review`, {
      headers: auth(reviewerToken),
      data: { action: 'reject', comment: '缺少续航参数，请补充后再提交' },
    });
    expect(rejected.ok()).toBe(true);

    await loginAs(page, 'editor');
    await page.goto('/cars');
    await page.getByPlaceholder('搜索车型名称 / 系列 / 卖点').fill(CAR_NAME);
    await page.getByRole('button', { name: '查询' }).click();

    const row = page.locator('.el-table__row').filter({ hasText: CAR_NAME });
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: '审核记录' }).click();

    const drawer = page.locator('.el-drawer').filter({ hasText: `审核记录 · ${CAR_NAME}` });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText('最近一次被驳回')).toBeVisible();
    await expect(drawer.locator('.el-alert__description')).toHaveText(
      '缺少续航参数，请补充后再提交',
    );
    await expect(drawer.locator('.el-table__row').first()).toContainText('审核驳回');
    await expect(drawer.locator('.el-table__row').first()).toContainText(
      '缺少续航参数，请补充后再提交',
    );
  } finally {
    await request.delete(`${API_BASE}/v1/admin/cars/${carId}`, {
      headers: auth(editorToken),
    });
  }
});
