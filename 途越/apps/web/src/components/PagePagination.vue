<script setup lang="ts">
import { computed } from 'vue';

/**
 * 列表分页（US-CAR-01）。
 *
 * 页码只显示当前页前后各两页，几十页时也不会把一行塞满；
 * 每页条数可切，切完回到第 1 页，否则可能落到一个不存在的页上。
 */
const props = defineProps<{
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  rangeStart: number;
  rangeEnd: number;
  pageSizeOptions: readonly number[];
}>();

const emit = defineEmits<{
  'update:page': [page: number];
  'update:pageSize': [pageSize: number];
}>();

const WINDOW = 2;

const pages = computed<number[]>(() => {
  const start = Math.max(1, props.page - WINDOW);
  const end = Math.min(props.pageCount, props.page + WINDOW);
  const list: number[] = [];
  for (let index = start; index <= end; index += 1) list.push(index);
  return list;
});

function go(next: number): void {
  if (next < 1 || next > props.pageCount || next === props.page) return;
  emit('update:page', next);
}

function changePageSize(event: Event): void {
  const value = Number((event.target as HTMLSelectElement).value);
  emit('update:pageSize', value);
}
</script>

<template>
  <nav class="pagination" aria-label="车型列表分页">
    <p class="pagination__summary">
      共 <strong>{{ total }}</strong> 台车型 · 当前显示第 {{ rangeStart }}–{{ rangeEnd }} 台
    </p>

    <div class="pagination__controls">
      <button
        type="button"
        class="pagination__button"
        :disabled="page <= 1"
        data-page="prev"
        @click="go(page - 1)"
      >
        上一页
      </button>

      <button
        v-for="item in pages"
        :key="item"
        type="button"
        class="pagination__button pagination__button--page"
        :class="{ 'is-current': item === page }"
        :aria-current="item === page ? 'page' : undefined"
        :data-page="item"
        @click="go(item)"
      >
        {{ item }}
      </button>

      <button
        type="button"
        class="pagination__button"
        :disabled="page >= pageCount"
        data-page="next"
        @click="go(page + 1)"
      >
        下一页
      </button>
    </div>

    <label class="pagination__size">
      每页
      <select :value="pageSize" @change="changePageSize">
        <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }}</option>
      </select>
      台
    </label>
  </nav>
</template>

<style scoped>
.pagination {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-top: var(--space-6);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-line);
}

.pagination__summary {
  margin: 0;
  font-size: 13px;
  color: var(--color-ink-muted);
}

.pagination__summary strong {
  color: var(--color-ink);
}

.pagination__controls {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.pagination__button {
  min-width: 36px;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-ink-soft);
  font-size: 13px;
  cursor: pointer;
}

.pagination__button:hover:not(:disabled) {
  border-color: var(--color-brand);
  color: var(--color-brand);
}

.pagination__button:disabled {
  color: #b6c0cc;
  cursor: not-allowed;
}

.pagination__button.is-current {
  border-color: var(--color-brand);
  background: var(--color-brand);
  color: #fff;
  font-weight: 600;
}

.pagination__size {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: 13px;
  color: var(--color-ink-muted);
}

.pagination__size select {
  padding: 6px var(--space-2);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  font-size: 13px;
  color: var(--color-ink);
}

@media (max-width: 640px) {
  .pagination {
    justify-content: center;
  }

  .pagination__summary {
    width: 100%;
    text-align: center;
  }
}
</style>
