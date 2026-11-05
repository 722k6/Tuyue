import type { DashboardMetrics } from '@tuyue/contracts';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDashboardStore } from '../src/features/dashboard/dashboard.store';

const metrics: DashboardMetrics = {
  periodStart: '2026-10-27T00:00:00.000Z',
  periodEnd: '2026-11-03T00:00:00.000Z',
  totalVisits: 12_480,
  aiUsageCount: 1_236,
  comparisonCount: 842,
  activityImpressions: 5_310,
  popularCars: [{ carId: 'ty-suv-001', views: 3_120 }],
};

describe('dashboard store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.unstubAllGlobals();
  });

  it('maps the metrics into four fixed KPI cards', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: metrics, requestId: 'req-dashboard' }),
      }),
    );

    const store = useDashboardStore();
    await store.load();

    expect(store.status).toBe('ready');
    expect(store.kpis.map((kpi) => kpi.label)).toEqual([
      '总访问量',
      'AI 使用次数',
      '车型对比次数',
      '活动曝光',
    ]);
    expect(store.kpis.map((kpi) => kpi.value)).toEqual([12_480, 1_236, 842, 5_310]);
    expect(store.popularCars[0]?.carId).toBe('ty-suv-001');
  });

  it('keeps the dashboard empty when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));

    const store = useDashboardStore();
    await store.load();

    expect(store.status).toBe('error');
    expect(store.kpis).toEqual([]);
    expect(store.popularCars).toEqual([]);
  });
});
