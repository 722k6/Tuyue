<script setup lang="ts">
import {
  BodyStyle,
  CarCatalogSort,
  EnergyType,
  SortDirection,
  type CarCatalogQuery,
} from '@tuyue/contracts';
import { computed, reactive, watch } from 'vue';
import { useRoute, useRouter, type LocationQueryRaw } from 'vue-router';
import { TrackEventName, track } from '../analytics/track';
import CarCard from '../components/CarCard.vue';
import EmptyState from '../components/EmptyState.vue';
import LoadingSkeleton from '../components/LoadingSkeleton.vue';
import PagePagination from '../components/PagePagination.vue';
import {
  CAR_PAGE_SIZE_OPTIONS,
  DEFAULT_CAR_PAGE_SIZE,
  useCarListStore,
} from '../features/car/car-list.store';

/**
 * 前台车型列表（US-CAR-01 + US-CAR-03 / US-SRC-01）。
 *
 * 两条责任线落在同一个页面上，所以数据流只留一个出口：
 * 筛选 / 搜索条件（keyword、energyType、bodyStyle、价格区间、sort）写进 URL，
 * 统一由 buildApiQuery() 转成接口参数；分页（page、pageSize）同样在 URL 里，
 * 但由前端切片——条件变了回第 1 页，只翻页就复用已有结果，不重复打接口。
 */
const route = useRoute();
const router = useRouter();
const list = useCarListStore();

type SortOption = '' | 'price-asc' | 'price-desc' | 'popularity-desc';

const filters = reactive({
  keyword: '',
  energyType: '',
  bodyStyle: '',
  minPriceWan: '',
  maxPriceWan: '',
  sort: '' as SortOption,
});

function queryValue(name: string): string {
  const value = route.query[name];
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

function syncFiltersFromUrl(): void {
  filters.keyword = queryValue('keyword');
  filters.energyType = queryValue('energyType');
  filters.bodyStyle = queryValue('bodyStyle');
  filters.minPriceWan = queryValue('minPrice');
  filters.maxPriceWan = queryValue('maxPrice');
  const sort = queryValue('sort');
  filters.sort = ['price-asc', 'price-desc', 'popularity-desc'].includes(sort)
    ? (sort as SortOption)
    : '';
}

function readPriceWan(value: string, label: string): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${label}请输入 0 以上的数字`);
  return parsed;
}

/** 地址栏 → 接口参数。筛选条件一律以 URL 为准，刷新、分享、前进后退都还原同一份结果。 */
function buildApiQuery(): CarCatalogQuery {
  const query: CarCatalogQuery = {};
  const keyword = queryValue('keyword').trim();
  const energyType = queryValue('energyType');
  const bodyStyle = queryValue('bodyStyle');
  const minPriceWan = readPriceWan(queryValue('minPrice'), '最低价');
  const maxPriceWan = readPriceWan(queryValue('maxPrice'), '最高价');
  const sort = queryValue('sort');

  if (minPriceWan !== undefined && maxPriceWan !== undefined && minPriceWan > maxPriceWan) {
    throw new Error('最低价不能大于最高价');
  }
  if (keyword) query.keyword = keyword;
  if (Object.values(EnergyType).includes(energyType as EnergyType)) {
    query.energyType = energyType as EnergyType;
  }
  if (Object.values(BodyStyle).includes(bodyStyle as BodyStyle)) {
    query.bodyStyle = bodyStyle as BodyStyle;
  }
  if (minPriceWan !== undefined) query.minPriceCents = Math.round(minPriceWan * 1_000_000);
  if (maxPriceWan !== undefined) query.maxPriceCents = Math.round(maxPriceWan * 1_000_000);
  if (sort === 'price-asc' || sort === 'price-desc') {
    query.sortBy = CarCatalogSort.PRICE;
    query.sortDirection = sort === 'price-asc' ? SortDirection.ASC : SortDirection.DESC;
  }
  if (sort === 'popularity-desc') {
    query.sortBy = CarCatalogSort.POPULARITY;
    query.sortDirection = SortDirection.DESC;
  }
  return query;
}

/** 表单 → 地址栏。不带 page / pageSize，条件一变自然回到第 1 页。 */
function buildUrlQuery(): LocationQueryRaw {
  const query: LocationQueryRaw = {};
  if (filters.keyword.trim()) query.keyword = filters.keyword.trim();
  if (filters.energyType) query.energyType = filters.energyType;
  if (filters.bodyStyle) query.bodyStyle = filters.bodyStyle;
  if (filters.minPriceWan) query.minPrice = filters.minPriceWan;
  if (filters.maxPriceWan) query.maxPrice = filters.maxPriceWan;
  if (filters.sort) query.sort = filters.sort;
  return query;
}

/** 只用来判断「筛选条件变没变」，不参与请求。 */
function filterSignature(): string {
  return JSON.stringify(buildUrlQuery());
}

let appliedSignature: string | null = null;

async function reload(): Promise<void> {
  await list.load(buildApiQuery());
}

async function applyFilters(): Promise<void> {
  try {
    // 前端先校验一遍，条件不合法就不发请求，也不把脏参数写进地址栏
    readPriceWan(filters.minPriceWan, '最低价');
    readPriceWan(filters.maxPriceWan, '最高价');
    const target = router.resolve({ path: '/cars', query: buildUrlQuery() });
    if (target.fullPath === route.fullPath) await reload();
    else await router.push(target);
  } catch (cause) {
    list.fail(cause instanceof Error ? cause.message : '筛选条件无效');
  }
}

async function resetFilters(): Promise<void> {
  Object.assign(filters, {
    keyword: '',
    energyType: '',
    bodyStyle: '',
    minPriceWan: '',
    maxPriceWan: '',
    sort: '',
  });
  if (route.fullPath === '/cars') await reload();
  else await router.push('/cars');
}

/** 页码与每页条数写回地址栏；默认值不落参数，「清空条件」后地址栏才干净。 */
function syncPaginationToUrl(): void {
  const query = buildUrlQuery();
  if (list.page > 1) query.page = String(list.page);
  if (list.pageSize !== DEFAULT_CAR_PAGE_SIZE) query.pageSize = String(list.pageSize);
  const target = router.resolve({ path: '/cars', query });
  if (target.fullPath !== route.fullPath) void router.replace(target);
}

function changePage(next: number): void {
  list.setPage(next);
  syncPaginationToUrl();
}

function changePageSize(next: number): void {
  list.setPageSize(next);
  syncPaginationToUrl();
}

const hasFilters = computed(() => Object.keys(buildUrlQuery()).length > 0);

const resultSummary = computed(() => {
  if (list.status !== 'ready') return '';
  const keyword = queryValue('keyword').trim();
  return keyword ? `“${keyword}”共找到 ${list.total} 款车型` : `共 ${list.total} 款车型`;
});

watch(
  () => route.fullPath,
  async () => {
    syncFiltersFromUrl();
    list.applyQuery({ page: route.query.page, pageSize: route.query.pageSize });

    const signature = filterSignature();
    // 只是翻页：结果已经在 store 里，不必再打一次接口
    if (signature === appliedSignature && list.status === 'ready') return;
    appliedSignature = signature;
    await reload();
  },
  { immediate: true },
);

void track(TrackEventName.PAGE_VIEW, { page: 'cars' });
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

    <form class="car-filters" aria-label="车型筛选与搜索" @submit.prevent="applyFilters">
      <label class="filter-keyword">
        <span>关键词</span>
        <input
          v-model="filters.keyword"
          name="keyword"
          type="search"
          maxlength="80"
          placeholder="车型名称、别名或参数，如 620"
        />
      </label>
      <label>
        <span>能源类型</span>
        <select v-model="filters.energyType" name="energyType">
          <option value="">全部能源</option>
          <option :value="EnergyType.GASOLINE">燃油</option>
          <option :value="EnergyType.HYBRID">混动</option>
          <option :value="EnergyType.ELECTRIC">纯电</option>
        </select>
      </label>
      <label>
        <span>车身形式</span>
        <select v-model="filters.bodyStyle" name="bodyStyle">
          <option value="">全部形式</option>
          <option :value="BodyStyle.SUV">SUV</option>
          <option :value="BodyStyle.SEDAN">轿车</option>
          <option :value="BodyStyle.MPV">MPV</option>
        </select>
      </label>
      <label>
        <span>最低价（万元）</span>
        <input v-model="filters.minPriceWan" name="minPrice" type="number" min="0" step="0.1" />
      </label>
      <label>
        <span>最高价（万元）</span>
        <input v-model="filters.maxPriceWan" name="maxPrice" type="number" min="0" step="0.1" />
      </label>
      <label>
        <span>排序</span>
        <select v-model="filters.sort" name="sort">
          <option value="">默认排序</option>
          <option value="price-asc">价格从低到高</option>
          <option value="price-desc">价格从高到低</option>
          <option value="popularity-desc">热度从高到低</option>
        </select>
      </label>
      <div class="filter-actions">
        <button class="primary-button" type="submit">筛选 / 搜索</button>
        <button class="secondary-button" type="button" @click="resetFilters">清空条件</button>
      </div>
    </form>

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
      v-else-if="list.total === 0 && !hasFilters"
      title="暂无在售车型"
      description="车型资料正在整理中，稍后再来看看，或到品牌活动页了解最新动态。"
      action-label="刷新列表"
      @action="reload"
    />

    <div v-else-if="list.total === 0" class="cars-empty">
      <h2>没有找到匹配车型</h2>
      <p>请尝试缩短关键词、放宽价格范围，或清空部分筛选条件。</p>
      <button class="secondary-button" type="button" @click="resetFilters">查看全部车型</button>
    </div>

    <template v-else>
      <p class="cars-page__summary">{{ resultSummary }}</p>

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
        @update:page="changePage"
        @update:page-size="changePageSize"
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

.cars-page__summary {
  margin: 0 0 var(--space-3);
  color: var(--color-ink-muted);
  font-size: 0.9rem;
}

.car-filters {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-4);
  margin-bottom: var(--space-5);
  padding: var(--space-5);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.car-filters label {
  display: grid;
  gap: var(--space-2);
  color: var(--color-ink-soft);
  font-size: 0.9rem;
  font-weight: 600;
}

.car-filters input,
.car-filters select {
  width: 100%;
  min-height: 44px;
  padding: 9px 12px;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-ink);
}

.car-filters input:focus,
.car-filters select:focus {
  outline: 3px solid rgb(36 87 167 / 18%);
  border-color: var(--color-brand);
}

.filter-keyword {
  grid-column: span 2;
}

.filter-actions {
  display: flex;
  align-items: end;
  gap: 10px;
  flex-wrap: wrap;
}

.primary-button,
.secondary-button {
  min-height: 44px;
  padding: 9px 16px;
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.primary-button {
  border: 1px solid var(--color-brand);
  background: var(--color-brand);
  color: #fff;
}

.secondary-button {
  border: 1px solid var(--color-line);
  background: var(--color-surface);
  color: var(--color-ink-soft);
}

.cars-empty {
  display: grid;
  justify-items: center;
  gap: var(--space-2);
  padding: var(--space-7) var(--space-5);
  border: 1px dashed var(--color-line);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  text-align: center;
}

.cars-empty h2 {
  margin: 0;
  font-size: 1.1rem;
}

.cars-empty p {
  margin: 0;
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

@media (max-width: 760px) {
  .car-filters {
    grid-template-columns: minmax(0, 1fr);
    padding: var(--space-4);
  }

  .filter-keyword {
    grid-column: auto;
  }

  .filter-actions {
    align-items: stretch;
    flex-direction: column;
  }
}

@media (max-width: 640px) {
  .cars-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
