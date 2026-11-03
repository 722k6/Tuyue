<script setup lang="ts">
import { onMounted } from 'vue';
import { useDashboardStore } from '../features/dashboard/dashboard.store';
import { useAdminHealthStore } from '../stores/health';

const health = useAdminHealthStore();
const dashboard = useDashboardStore();

onMounted(() => {
  void health.check();
  void dashboard.load();
});

function formatNumber(value: number): string {
  return value.toLocaleString('zh-CN');
}
</script>

<template>
  <section>
    <h1>数据看板</h1>
    <el-alert :title="`Mock API 状态：${health.status}`" type="info" :closable="false" />

    <p v-if="dashboard.status === 'loading'">加载中…</p>
    <p v-else-if="dashboard.status === 'error'">看板数据加载失败，请稍后重试。</p>

    <template v-else-if="dashboard.status === 'ready'">
      <div class="kpi-grid">
        <div v-for="kpi in dashboard.kpis" :key="kpi.key" class="kpi-card">
          <p class="kpi-card__label">{{ kpi.label }}</p>
          <p class="kpi-card__value">{{ formatNumber(kpi.value) }}</p>
        </div>
      </div>

      <h2>热门车型</h2>
      <ul v-if="dashboard.popularCars.length" class="popular-list">
        <li v-for="car in dashboard.popularCars" :key="car.carId">
          {{ car.carId }} · {{ formatNumber(car.views) }} 次浏览
        </li>
      </ul>
      <p v-else>暂无浏览数据。</p>
    </template>
  </section>
</template>
