<script setup lang="ts">
import {
  BodyStyle,
  CarCatalogSort,
  EnergyType,
  SortDirection,
  type CarCatalogQuery,
  type CarSummary,
} from '@tuyue/contracts';
import { computed, reactive, ref, watch } from 'vue';
import { useRoute, useRouter, type LocationQueryRaw } from 'vue-router';
import { webApi } from '../api';
import CompareToggle from '../features/compare/CompareToggle.vue';

type SortOption = '' | 'price-asc' | 'price-desc' | 'popularity-desc';

const route = useRoute();
const router = useRouter();
const cars = ref<CarSummary[]>([]);
const loading = ref(false);
const error = ref('');
let requestSequence = 0;

const filters = reactive({
  keyword: '',
  energyType: '',
  bodyStyle: '',
  minPriceWan: '',
  maxPriceWan: '',
  sort: '' as SortOption,
});

const energyLabels: Record<string, string> = {
  [EnergyType.GASOLINE]: '燃油',
  [EnergyType.HYBRID]: '混动',
  [EnergyType.ELECTRIC]: '纯电',
};

const bodyStyleLabels: Record<string, string> = {
  [BodyStyle.SUV]: 'SUV',
  [BodyStyle.SEDAN]: '轿车',
  [BodyStyle.MPV]: 'MPV',
};

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

async function loadCars(): Promise<void> {
  const currentRequest = ++requestSequence;
  loading.value = true;
  error.value = '';
  try {
    const response = await webApi.cars(buildApiQuery());
    if (currentRequest === requestSequence) cars.value = response.data;
  } catch (cause) {
    if (currentRequest === requestSequence) {
      cars.value = [];
      error.value = cause instanceof Error ? cause.message : '车型接口暂时不可用';
    }
  } finally {
    if (currentRequest === requestSequence) loading.value = false;
  }
}

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

async function applyFilters(): Promise<void> {
  error.value = '';
  try {
    const minPriceWan = readPriceWan(filters.minPriceWan, '最低价');
    const maxPriceWan = readPriceWan(filters.maxPriceWan, '最高价');
    if (minPriceWan !== undefined && maxPriceWan !== undefined && minPriceWan > maxPriceWan) {
      throw new Error('最低价不能大于最高价');
    }
    const target = router.resolve({ path: '/cars', query: buildUrlQuery() });
    if (target.fullPath === route.fullPath) await loadCars();
    else await router.push(target);
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '筛选条件无效';
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
  if (route.fullPath === '/cars') await loadCars();
  else await router.push('/cars');
}

function formatPriceRange(car: CarSummary): string {
  const min = (car.priceMinCents / 1_000_000).toFixed(2).replace(/\.00$/, '');
  const max = (car.priceMaxCents / 1_000_000).toFixed(2).replace(/\.00$/, '');
  return `${min}–${max} 万元`;
}

const resultSummary = computed(() => {
  const keyword = queryValue('keyword').trim();
  return keyword
    ? `“${keyword}”共找到 ${cars.value.length} 款车型`
    : `共 ${cars.value.length} 款车型`;
});

watch(
  () => route.fullPath,
  () => {
    syncFiltersFromUrl();
    void loadCars();
  },
  { immediate: true },
);
</script>

<template>
  <section class="cars-page">
    <p class="eyebrow">FIND YOUR TUYUE</p>
    <h1>车型筛选与搜索</h1>

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

    <p v-if="error" class="feedback error-message" role="alert">{{ error }}</p>
    <p v-else-if="loading" class="feedback" aria-live="polite">正在加载车型…</p>
    <template v-else>
      <div class="result-heading">
        <h2>搜索结果</h2>
        <p>{{ resultSummary }}</p>
      </div>
      <div v-if="cars.length" class="grid car-grid">
        <article v-for="car in cars" :key="car.id" class="car-card">
          <div class="car-meta">
            <span>{{ energyLabels[car.energyType] }}</span>
            <span v-if="car.bodyStyle">{{ bodyStyleLabels[car.bodyStyle] }}</span>
          </div>
          <p class="car-series">{{ car.series }}</p>
          <h2>{{ car.name }}</h2>
          <p>{{ car.tagline }}</p>
          <p class="car-price">{{ formatPriceRange(car) }}</p>
          <div class="card-actions">
            <RouterLink :to="`/cars/${car.id}`">查看车型详情</RouterLink>
            <CompareToggle :car="car" />
          </div>
        </article>
      </div>
      <div v-else class="empty-state">
        <h2>没有找到匹配车型</h2>
        <p>请尝试缩短关键词、放宽价格范围，或清空部分筛选条件。</p>
        <button class="secondary-button" type="button" @click="resetFilters">查看全部车型</button>
      </div>
    </template>
  </section>
</template>

<style scoped>
button,
input,
select {
  font: inherit;
}

.car-filters {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 28px;
  padding: 24px;
  border: 1px solid #dbe3ec;
  border-radius: 14px;
  background: #fff;
}

.car-filters label {
  display: grid;
  gap: 8px;
  color: #354252;
  font-size: 0.9rem;
  font-weight: 600;
}

.car-filters input,
.car-filters select {
  width: 100%;
  min-height: 44px;
  padding: 9px 12px;
  border: 1px solid #bcc9d8;
  border-radius: 8px;
  background: #fff;
  color: #17202a;
}

.car-filters input:focus,
.car-filters select:focus {
  outline: 3px solid rgb(36 87 167 / 18%);
  border-color: #2457a7;
}

.filter-keyword {
  grid-column: span 2;
}

.filter-actions,
.card-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.filter-actions {
  align-items: end;
}

.card-actions {
  margin-top: 10px;
}

.primary-button,
.secondary-button {
  min-height: 44px;
  padding: 9px 16px;
  border-radius: 8px;
  cursor: pointer;
}

.primary-button {
  border: 1px solid #2457a7;
  background: #2457a7;
  color: #fff;
}

.secondary-button {
  border: 1px solid #aebdce;
  background: #fff;
  color: #26384b;
}

.feedback,
.empty-state {
  padding: 24px;
  border-radius: 12px;
  background: #fff;
}

.error-message {
  border: 1px solid #f1b8b8;
  color: #9b2020;
  background: #fff3f3;
}

.result-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  margin: 28px 0 16px;
}

.result-heading h2,
.result-heading p {
  margin: 0;
}

.car-card {
  border: 1px solid #e0e6ed;
  box-shadow: 0 8px 24px rgb(29 50 74 / 7%);
}

.car-card h2 {
  margin: 8px 0;
  font-size: 1.5rem;
}

.car-meta {
  display: flex;
  gap: 8px;
}

.car-meta span {
  padding: 4px 8px;
  border-radius: 999px;
  background: #e8f0fa;
  color: #234f85;
  font-size: 0.8rem;
}

.car-series {
  color: #647386;
}

.car-price {
  font-size: 1.1rem;
  font-weight: 700;
  color: #b14b25;
}

.empty-state {
  text-align: center;
}

@media (max-width: 760px) {
  .car-filters {
    grid-template-columns: 1fr;
  }

  .filter-keyword {
    grid-column: auto;
  }

  .filter-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .result-heading {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
