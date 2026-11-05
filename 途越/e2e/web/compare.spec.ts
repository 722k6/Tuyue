import { expect, test } from '@playwright/test';
import { waitForApiReady } from '../support/wait-for-api';

/**
 * US-CMP-01 加入对比与对比栏 / US-CMP-02 对比表对齐渲染。
 *
 * 每个用例用独立的 browser context，localStorage 是干净的，不会串对比清单。
 */
test.describe('官网车型对比', () => {
  test.beforeEach(async ({ request }) => {
    await waitForApiReady(request);
  });

  test('列表页加入两台车后悬浮对比栏出现，并可进入对比页', async ({ page }) => {
    await page.goto('/cars');

    const toggleOfSuv = page.locator('.compare-toggle[data-car-id="ty-suv-001"]');
    const toggleOfEv = page.locator('.compare-toggle[data-car-id="ty-ev-001"]');
    await expect(toggleOfSuv).toBeVisible();

    await toggleOfSuv.click();
    await expect(toggleOfSuv).toHaveAttribute('data-selected', 'true');
    await toggleOfEv.click();

    const bar = page.locator('.compare-bar');
    await expect(bar).toBeVisible();
    await expect(bar.locator('.compare-bar__item')).toHaveCount(2);
    await expect(bar.locator('.compare-bar__count')).toHaveText('对比 2/4');

    await bar.getByRole('button', { name: '开始对比' }).click();
    await expect(page).toHaveURL(/\/compare$/);
    await expect(page.locator('.compare-table')).toBeVisible();
  });

  test('对比栏在刷新后仍然保留（本地与服务端双存）', async ({ page }) => {
    await page.goto('/cars');
    await page.locator('.compare-toggle[data-car-id="ty-ev-001"]').click();
    await expect(page.locator('.compare-bar__item')).toHaveCount(1);

    await page.reload();

    await expect(page.locator('.compare-bar')).toBeVisible();
    await expect(page.locator('.compare-bar__item')).toHaveCount(1);
    await expect(page.locator('.compare-bar__item')).toContainText('途越星驰');
  });

  test('最多 4 台：第 5 台无法再加入', async ({ page, request }) => {
    // 先确认只有 4 台上架车型，凑够上限
    const response = await request.get('http://127.0.0.1:3000/api/v1/cars');
    const body = (await response.json()) as { data: Array<{ id: string }> };
    test.skip(body.data.length < 4, '上架车型不足 4 台，无法验证上限');

    await page.goto('/cars');
    for (const id of body.data.slice(0, 4).map((car) => car.id)) {
      await page.locator(`.compare-toggle[data-car-id="${id}"]`).click();
    }

    await expect(page.locator('.compare-bar__count')).toHaveText('对比 4/4');

    // 第 5 台的入口不应还能点：满员后按钮禁用并给出原因
    const remaining = page.locator('.compare-toggle[data-selected="false"]');
    if ((await remaining.count()) > 0) {
      await expect(remaining.first()).toBeDisabled();
      await expect(remaining.first()).toContainText('对比已满');
    }
  });

  test('对比表按分组对齐，缺失值用占位符而不是 0', async ({ page }) => {
    await page.goto('/cars');
    await page.locator('.compare-toggle[data-car-id="ty-suv-001"]').click();
    await page.locator('.compare-toggle[data-car-id="ty-ev-001"]').click();
    await page.goto('/compare');

    await expect(page.locator('.compare-table')).toBeVisible();

    // 分组顺序固定：动力 → 尺寸 → 安全 → 智能
    await expect(page.locator('.compare-group')).toHaveCount(4);
    await expect(page.locator('.compare-group th')).toHaveText(['动力', '尺寸', '安全', '智能']);

    // 纯电续航只有电车有，燃油车那一格必须是「—」
    const rangeRow = page.locator('.compare-row[data-code="range"]');
    await expect(rangeRow).toBeVisible();
    await expect(rangeRow).toHaveAttribute('data-different', 'true');
    await expect(rangeRow.locator('.compare-cell--missing')).toHaveCount(1);
    await expect(rangeRow.locator('.compare-cell--missing')).toHaveText('—');

    // 四列参数一一对齐，每行都能对上每一台车
    const params = await page.locator('.compare-table thead .compare-table__car').count();
    expect(params).toBe(2);
  });

  test('开启「只看差异」后所有可见行都是差异行', async ({ page }) => {
    await page.goto('/cars');
    await page.locator('.compare-toggle[data-car-id="ty-suv-001"]').click();
    await page.locator('.compare-toggle[data-car-id="ty-hybrid-001"]').click();
    await page.goto('/compare');
    await expect(page.locator('.compare-table')).toBeVisible();

    const allRows = await page.locator('.compare-row').count();
    await page.locator('[data-testid="only-different"]').check();

    const rows = page.locator('.compare-row');
    const visible = await rows.count();
    expect(visible).toBeGreaterThan(0);
    expect(visible).toBeLessThanOrEqual(allRows);

    const flags = await rows.evaluateAll((elements) =>
      elements.map((element) => element.getAttribute('data-different')),
    );
    expect(flags.every((flag) => flag === 'true')).toBe(true);
  });

  test('移除一台车后不再渲染对比表，回到补齐提示', async ({ page }) => {
    await page.goto('/cars');
    await page.locator('.compare-toggle[data-car-id="ty-suv-001"]').click();
    await page.locator('.compare-toggle[data-car-id="ty-ev-001"]').click();
    await page.goto('/compare');

    await expect(page.locator('.compare-table thead .compare-table__car')).toHaveCount(2);

    await page
      .locator('.compare-table__car[data-car-id="ty-suv-001"] .compare-table__remove')
      .click();

    // 只剩一台时不满足「对比」的前提，页面退回补齐引导而不是渲染一张单列表
    await expect(page.locator('.compare-empty')).toContainText('再选 1 台');
    await expect(page.locator('.compare-table')).toHaveCount(0);
    await expect(page.locator('.compare-bar')).toHaveCount(0);
  });

  test('移动端窄屏下对比表横向滚动，不挤压列宽', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 720 });

    await page.goto('/cars');
    await page.locator('.compare-toggle[data-car-id="ty-suv-001"]').click();
    await page.locator('.compare-toggle[data-car-id="ty-ev-001"]').click();
    await page.locator('.compare-toggle[data-car-id="ty-hybrid-001"]').click();
    await page.goto('/compare');

    const scroll = page.locator('.compare-table__scroll');
    await expect(scroll).toBeVisible();

    const metrics = await scroll.evaluate((element) => ({
      overflowX: getComputedStyle(element).overflowX,
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
    }));

    expect(metrics.overflowX).toBe('auto');
    expect(metrics.scrollWidth).toBeGreaterThan(metrics.clientWidth);
  });
});
