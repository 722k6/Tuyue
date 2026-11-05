<script setup lang="ts">
import { COMPARE_MAX_SIZE, type CompareParameterGroupDto } from '@tuyue/contracts';
import { computed, onMounted, ref, watch } from 'vue';
import { useCompareStore } from '../features/compare/compare.store';

/**
 * 对比表（US-CMP-02）。
 *
 * 三条渲染规则来自验收要点：
 * 1. 多车参数取并集，任何一台车独有的参数都要成行，不能因为别的车没有就被吞掉；
 * 2. 缺失值显示占位符「—」并置灰，不能用 0 或空白冒充一个真实数值；
 * 3. 差异行整行高亮 + 可切换「只看差异」，四台车几十行参数时这比逐行扫更快。
 */
const store = useCompareStore();
const onlyDifferent = ref(false);

const columns = computed(() => store.matrix?.columns ?? []);
const groups = computed(() => store.matrix?.groups ?? []);

const visibleGroups = computed<CompareParameterGroupDto[]>(() => {
  if (!onlyDifferent.value) return groups.value;
  return groups.value
    .map((group) => ({ ...group, rows: group.rows.filter((row) => row.different) }))
    .filter((group) => group.rows.length > 0);
});

const summary = computed(() => {
  if (!store.matrix) return '';
  return `共 ${store.matrix.totalRows} 项参数，其中 ${store.matrix.differentRows} 项存在差异`;
});

onMounted(async () => {
  await store.load();
  if (store.canCompare) await store.loadMatrix();
});

// 移除一台车后车列变了，矩阵必须重新取，否则会拿旧列去算差异
watch(
  () => store.carIds.join('|'),
  async () => {
    if (store.canCompare) await store.loadMatrix();
  },
);

function valueOf(valuesByCarId: Record<string, string | null>, carId: string): string | null {
  return valuesByCarId[carId] ?? null;
}

function formatPrice(minCents: number, maxCents: number): string {
  const min = (minCents / 1_000_000).toFixed(2);
  const max = (maxCents / 1_000_000).toFixed(2);
  return min === max ? `${min} 万` : `${min}–${max} 万`;
}
</script>

<template>
  <section class="compare-page">
    <header class="compare-page__head">
      <div>
        <h1>车型对比</h1>
        <p class="compare-page__hint">
          最多同时对比 {{ COMPARE_MAX_SIZE }} 台车型。<span v-if="summary">{{ summary }}。</span>
        </p>
      </div>
      <div class="compare-page__tools">
        <label class="compare-page__switch">
          <input v-model="onlyDifferent" type="checkbox" data-testid="only-different" />
          只看差异
        </label>
        <button type="button" class="compare-page__ghost" @click="store.clear()">清空对比</button>
      </div>
    </header>

    <div v-if="store.count === 0" class="compare-empty">
      <p>还没有选择车型。</p>
      <RouterLink to="/cars">去车型列表挑几台</RouterLink>
    </div>

    <div v-else-if="store.count === 1" class="compare-empty">
      <p>再选 1 台就能开始对比了。</p>
      <RouterLink to="/cars">继续挑选车型</RouterLink>
    </div>

    <p v-else-if="store.matrixStatus === 'loading'" class="compare-empty">正在整理参数…</p>

    <div v-else-if="store.matrixStatus === 'error'" class="compare-empty">
      <p>参数加载失败，可能是 Mock API 未启动。</p>
      <button type="button" class="compare-page__ghost" @click="store.loadMatrix()">重新加载</button>
    </div>

    <div v-else-if="store.matrix" class="compare-table__scroll">
      <table class="compare-table">
        <thead>
          <tr>
            <th class="compare-table__param">参数</th>
            <th
              v-for="column in columns"
              :key="column.carId"
              class="compare-table__car"
              :data-car-id="column.carId"
            >
              <span class="compare-table__car-name">{{ column.name }}</span>
              <span class="compare-table__car-meta">{{ column.series }}</span>
              <span class="compare-table__car-price">
                {{ formatPrice(column.priceMinCents, column.priceMaxCents) }}
              </span>
              <button
                type="button"
                class="compare-table__remove"
                :aria-label="`移除 ${column.name}`"
                @click="store.remove(column.carId)"
              >
                移除
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          <template v-for="group in visibleGroups" :key="group.group">
            <tr class="compare-group" :data-group="group.group">
              <th :colspan="columns.length + 1">{{ group.label }}</th>
            </tr>
            <tr
              v-for="row in group.rows"
              :key="row.code"
              class="compare-row"
              :class="{ 'is-different': row.different }"
              :data-code="row.code"
              :data-different="row.different ? 'true' : 'false'"
            >
              <th class="compare-table__param">
                {{ row.label }}
                <small v-if="row.unit" class="compare-table__unit">{{ row.unit }}</small>
              </th>
              <td
                v-for="column in columns"
                :key="column.carId"
                class="compare-cell"
                :data-missing="valueOf(row.valuesByCarId, column.carId) === null ? 'true' : 'false'"
              >
                <template v-if="valueOf(row.valuesByCarId, column.carId) !== null">
                  {{ valueOf(row.valuesByCarId, column.carId) }}
                </template>
                <span v-else class="compare-cell--missing">—</span>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
      <p class="compare-table__legend">「—」表示该车型没有这项参数，不是 0，也不参与同值比较。</p>
    </div>
  </section>
</template>

<style scoped>
.compare-page__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}
.compare-page__hint {
  color: #6b7686;
  margin: 0 0 16px;
}
.compare-page__tools {
  display: flex;
  align-items: center;
  gap: 12px;
}
.compare-page__switch {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #33465a;
  cursor: pointer;
}
.compare-page__ghost {
  border: 1px solid #c9d4e0;
  background: #fff;
  color: #33465a;
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 13px;
  cursor: pointer;
}
.compare-empty {
  padding: 48px 0;
  text-align: center;
  color: #6b7686;
}
.compare-empty a,
.compare-empty button {
  color: #2457a7;
}

/* 移动端横向滚动：四台车的参数表在 375px 宽度下必然放不下，宁愿横向滑动也不要压缩到读不清 */
.compare-table__scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e3e9f0;
}
.compare-table {
  width: 100%;
  min-width: 560px;
  border-collapse: collapse;
  font-size: 14px;
}
.compare-table th,
.compare-table td {
  padding: 10px 14px;
  text-align: left;
  border-bottom: 1px solid #eef2f7;
  vertical-align: top;
}
.compare-table thead th {
  position: sticky;
  top: 0;
  background: #f8fafc;
  z-index: 1;
}
.compare-table__param {
  position: sticky;
  left: 0;
  background: #fff;
  min-width: 140px;
  font-weight: 500;
  color: #33465a;
  z-index: 2;
}
.compare-table thead .compare-table__param {
  background: #f8fafc;
  z-index: 3;
}
.compare-table__unit {
  margin-left: 4px;
  color: #9aa7b6;
  font-size: 12px;
}
.compare-table__car {
  min-width: 150px;
}
.compare-table__car-name {
  display: block;
  font-size: 15px;
  color: #17202a;
}
.compare-table__car-meta {
  display: block;
  color: #9aa7b6;
  font-size: 12px;
  font-weight: 400;
}
.compare-table__car-price {
  display: block;
  color: #b42318;
  font-size: 13px;
  font-weight: 600;
  margin-top: 2px;
}
.compare-table__remove {
  margin-top: 6px;
  border: 1px solid #e3e9f0;
  background: #fff;
  color: #6b7686;
  border-radius: 6px;
  padding: 2px 8px;
  font-size: 12px;
  cursor: pointer;
}
.compare-group th {
  background: #f1f5f9;
  font-size: 13px;
  color: #33465a;
  letter-spacing: 0.04em;
}
.compare-row.is-different {
  background: #fffaf0;
}
.compare-row.is-different .compare-table__param {
  background: #fffaf0;
  box-shadow: inset 3px 0 0 #f0a20c;
  font-weight: 600;
}
.compare-cell--missing {
  color: #b6c0cc;
}
.compare-cell[data-missing='true'] {
  background: #fbfcfd;
}
.compare-table__legend {
  margin: 12px 14px 16px;
  color: #9aa7b6;
  font-size: 12px;
}
</style>
