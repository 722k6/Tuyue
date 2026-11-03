import type { DashboardMetrics } from '@tuyue/contracts';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { fetchDashboard } from './dashboard.api';

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface DashboardKpi {
  key: keyof Pick<
    DashboardMetrics,
    'totalVisits' | 'aiUsageCount' | 'comparisonCount' | 'activityImpressions'
  >;
  label: string;
  value: number;
}

export const useDashboardStore = defineStore('dashboard', () => {
  const metrics = ref<DashboardMetrics | null>(null);
  const status = ref<LoadStatus>('idle');

  const kpis = computed<DashboardKpi[]>(() => {
    if (!metrics.value) return [];
    return [
      { key: 'totalVisits', label: '总访问量', value: metrics.value.totalVisits },
      { key: 'aiUsageCount', label: 'AI 使用次数', value: metrics.value.aiUsageCount },
      { key: 'comparisonCount', label: '车型对比次数', value: metrics.value.comparisonCount },
      { key: 'activityImpressions', label: '活动曝光', value: metrics.value.activityImpressions },
    ];
  });

  const popularCars = computed(() => metrics.value?.popularCars ?? []);

  async function load(): Promise<void> {
    status.value = 'loading';
    try {
      metrics.value = await fetchDashboard();
      status.value = 'ready';
    } catch {
      status.value = 'error';
    }
  }

  return { metrics, status, kpis, popularCars, load };
});
