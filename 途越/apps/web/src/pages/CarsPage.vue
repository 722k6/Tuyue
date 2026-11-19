<script setup lang="ts">
import { onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { TrackEventName, track } from '../analytics/track';
import CarCard from '../components/CarCard.vue';
import EmptyState from '../components/EmptyState.vue';
import LoadingSkeleton from '../components/LoadingSkeleton.vue';
import PagePagination from '../components/PagePagination.vue';
import {
  CAR_PAGE_SIZE_OPTIONS,
  parsePage,
  useCarListStore,
} from '../features/car/car-list.store';

/**
 * 前台车型列表（US-CAR-01）。
 *
 * 四条验收要点分别落在：
 * - 卡片列表 + 响应式栅格：桌面 3 列 / 平板 2 列 / 手机 1 列；
 * - 分页：页码、每页条数、总台数，并写进 URL 查询参数，刷新和分享链接都能回到同一页；
 * - 仅显示已上架：服务端已过滤，store 再兜一层（见 car-list.store.ts 注释）；
 * - 加载态 / 空态 / 失败态：骨架屏、空态占位、可重试错误态各一。
 */
const route = useRoute();
const router = useRouter();
const list = useCarListStore();

/** 把归一化后的分页写回地址栏；用 replace 是为了不把每次翻页都塞进浏览器历史。 */
function syncQuery(): void {
  const page = String(list.page);
  const pageSize = String(list.pageSize);
  if (route.query.page === page && route.query.pageSize === pageSize) return;
  void router.replace({ path: route.path, query: { ...route.query, page, pageSize } });
}

onMounted(async () => {
  list.applyQuery({ page: route.query.page, pageSize: route.query.pageSize });
  void track(TrackEventName.PAGE_VIEW, { page: 'cars' });
  await list.load();
  syncQuery();
});

// 翻页 / 换每页条数 → 同步地址栏
watch([() => list.page, () => list.pageSize], syncQuery);

// 浏览器前进后退 → 反向同步回 store（先 applyQuery 再 setPage，让页码落在合法范围内）
watch(
  () => [route.query.page, route.query.pageSize],
  ([page, pageSize]) => {
    if (String(list.page) === String(page) && String(list.pageSize) === String(pageSize)) return;
    list.applyQuery({ page, pageSize });
    list.setPage(parsePage(page));
  },
);

function reload(): void {
  void list.load();
}
</script>

<template>
  <section class="cars-page">
    <header class="cars-page__head">
      <p class="eyebrow">ALL MODELS</p>
      <h1>车型列表</h1>
      <p class="cars-page__lead">
        浏览途越在售车型，点开任意一台查看完整参数；对照选购时最多可挑 4 台加入对比。
      </p>
    </header>

    <LoadingSkeleton
      v-if="list.status === 'idle' || list.status === 'loading'"
      :count="list.pageSize >= 9 ? 6 : 3"
    />

    <EmptyState
      v-else-if="list.status === 'error'"
      tone="error"
      title="车型加载失败"
      :description="list.errorMessage"
      action-label="重新加载"
      @action="reload"
    />

    <EmptyState
      v-else-if="list.total === 0"
      title="暂无在售车型"
      description="车型资料正在整理中，稍后再来看看，或到品牌活动页了解最新动态。"
      action-label="刷新列表"
      @action="reload"
    />

    <template v-else>
      <div class="cars-grid">
        <CarCard v-for="car in list.pagedItems" :key="car.id" :car="car" />
      </div>

      <PagePagination
        :page="list.page"
        :page-count="list.pageCount"
        :total="list.total"
        :page-size="list.pageSize"
        :range-start="list.rangeStart"
        :range-end="list.rangeEnd"
        :page-size-options="CAR_PAGE_SIZE_OPTIONS"
        @update:page="list.setPage"
        @update:page-size="list.setPageSize"
      />
    </template>
  </section>
</template>

<style scoped>
.cars-page__head {
  max-width: 62ch;
}

.cars-page__lead {
  margin: 0 0 var(--space-5);
  color: var(--color-ink-muted);
}

.cars-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-5);
}

@media (max-width: 1023px) {
  .cars-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-4);
  }
}

@media (max-width: 640px) {
  .cars-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
