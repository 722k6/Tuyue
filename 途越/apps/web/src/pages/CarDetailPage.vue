<script setup lang="ts">
import { computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { TrackEventName, track } from '../analytics/track';
import CarGallery from '../components/CarGallery.vue';
import EmptyState from '../components/EmptyState.vue';
import LoadingSkeleton from '../components/LoadingSkeleton.vue';
import ParameterTable from '../components/ParameterTable.vue';
import { energyLabel } from '../features/car/car-labels';
import { useCarDetailStore } from '../features/car/car-detail.store';
import CompareToggle from '../features/compare/CompareToggle.vue';
import { formatDate, formatPriceRange } from '../shared/format';

/**
 * 前台车型详情（US-CAR-02）。
 *
 * 验收要点对应关系：
 * - 基础信息：名称 / 系列 / 能源 / 价格区间 / 卖点 / 描述 / 更新时间；
 * - 图集轮播：CarGallery（多图切换、缩略图、键盘方向键、失败降级）；
 * - 参数分组展示：ParameterTable（动力 / 尺寸 / 安全 / 智能 / 其他）；
 * - 不存在或已下架：接口返回 404，落 `notFound` 分支渲染占位页，而不是一句报错。
 */
const route = useRoute();
const detail = useCarDetailStore();

const carId = computed(() => String(route.params.id ?? ''));

/** 图集优先取 images（后台可排序、可设主图）；老数据没有 images 时退回 galleryUrls。 */
const galleryImages = computed(() => {
  const car = detail.car;
  if (!car) return [];
  return car.images.length > 0 ? car.images : car.galleryUrls.map((url) => ({ url }));
});

async function load(): Promise<void> {
  await detail.load(carId.value);
  if (detail.status === 'ready' && detail.car) {
    void track(TrackEventName.CAR_VIEW, { carId: detail.car.id, name: detail.car.name });
  }
}

onMounted(load);
// 从详情页点进另一台车时组件会被复用，必须跟着 id 重新取数
watch(carId, () => void load());
</script>

<template>
  <section class="car-detail">
    <nav class="car-detail__crumbs" aria-label="面包屑">
      <RouterLink to="/">首页</RouterLink>
      <span class="car-detail__crumb-sep" aria-hidden="true">/</span>
      <RouterLink to="/cars">车型</RouterLink>
      <template v-if="detail.car">
        <span class="car-detail__crumb-sep" aria-hidden="true">/</span>
        <span aria-current="page">{{ detail.car.name }}</span>
      </template>
    </nav>

    <LoadingSkeleton
      v-if="detail.status === 'idle' || detail.status === 'loading'"
      variant="detail"
      :count="2"
    />

    <div v-else-if="detail.status === 'notFound'" class="car-detail__placeholder">
      <p class="car-detail__code">404</p>
      <h1>车型不存在或已下架</h1>
      <p class="car-detail__placeholder-text">{{ detail.errorMessage }}</p>
      <RouterLink to="/cars" class="car-detail__primary">看看其他在售车型</RouterLink>
    </div>

    <EmptyState
      v-else-if="detail.status === 'error'"
      tone="error"
      title="详情加载失败"
      :description="detail.errorMessage"
      action-label="重新加载"
      @action="load"
    />

    <template v-else-if="detail.car">
      <div class="car-detail__hero">
        <CarGallery :name="detail.car.name" :images="galleryImages" />

        <div class="car-detail__summary">
          <p class="eyebrow">{{ detail.car.series }}</p>
          <h1 class="car-detail__name">{{ detail.car.name }}</h1>
          <p class="car-detail__tagline">{{ detail.car.tagline }}</p>

          <p class="car-detail__price">
            {{ formatPriceRange(detail.car.priceMinCents, detail.car.priceMaxCents) }}
            <span class="car-detail__price-note">官方指导价</span>
          </p>

          <dl class="car-detail__facts">
            <div>
              <dt>能源类型</dt>
              <dd>{{ energyLabel(detail.car.energyType) }}</dd>
            </div>
            <div>
              <dt>所属系列</dt>
              <dd>{{ detail.car.series }}</dd>
            </div>
            <div>
              <dt>最近更新</dt>
              <dd>{{ formatDate(detail.car.updatedAt) }}</dd>
            </div>
          </dl>

          <p class="car-detail__description">{{ detail.car.description }}</p>

          <div class="car-detail__actions">
            <CompareToggle :car="detail.car" />
            <RouterLink to="/cars" class="car-detail__back">返回车型列表</RouterLink>
          </div>
        </div>
      </div>

      <section class="car-detail__parameters">
        <h2>参数配置</h2>
        <ParameterTable :parameters="detail.car.parameters" />
      </section>
    </template>
  </section>
</template>

<style scoped>
.car-detail__crumbs {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
  font-size: 13px;
  color: var(--color-ink-muted);
}

.car-detail__crumbs a {
  color: var(--color-ink-muted);
}

.car-detail__crumbs a:hover {
  color: var(--color-brand);
}

.car-detail__crumb-sep {
  color: #b6c0cc;
}

.car-detail__hero {
  display: grid;
  grid-template-columns: 1.15fr 1fr;
  gap: var(--space-6);
  align-items: start;
}

.car-detail__summary {
  padding: var(--space-2) 0;
}

.car-detail__name {
  margin: var(--space-1) 0 var(--space-2);
}

.car-detail__tagline {
  margin: 0 0 var(--space-4);
  font-size: 15px;
  color: var(--color-ink-soft);
}

.car-detail__price {
  margin: 0 0 var(--space-5);
  font-size: 26px;
  font-weight: 700;
  color: var(--color-ink);
}

.car-detail__price-note {
  margin-left: var(--space-2);
  font-size: 12px;
  font-weight: 400;
  color: var(--color-ink-muted);
}

.car-detail__facts {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-3);
  margin: 0 0 var(--space-5);
  padding: var(--space-3) 0;
  border-top: 1px solid var(--color-line);
  border-bottom: 1px solid var(--color-line);
}

.car-detail__facts dt {
  font-size: 12px;
  color: var(--color-ink-muted);
}

.car-detail__facts dd {
  margin: var(--space-1) 0 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-ink);
}

.car-detail__description {
  margin: 0 0 var(--space-5);
  font-size: 14px;
  line-height: 1.75;
  color: var(--color-ink-soft);
}

.car-detail__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-4);
}

.car-detail__back {
  font-size: 13px;
  color: var(--color-ink-muted);
}

.car-detail__back:hover {
  color: var(--color-brand);
}

.car-detail__parameters {
  margin-top: var(--space-7);
  padding-top: var(--space-5);
  border-top: 1px solid var(--color-line);
}

.car-detail__parameters h2 {
  margin: 0 0 var(--space-5);
  font-size: 20px;
}

.car-detail__placeholder {
  display: grid;
  justify-items: center;
  gap: var(--space-2);
  padding: var(--space-8) var(--space-5);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  text-align: center;
}

.car-detail__code {
  margin: 0;
  font-size: 56px;
  font-weight: 800;
  line-height: 1;
  color: var(--color-line);
}

.car-detail__placeholder h1 {
  margin: 0;
  font-size: 22px;
}

.car-detail__placeholder-text {
  margin: 0 0 var(--space-4);
  font-size: 14px;
  color: var(--color-ink-muted);
}

.car-detail__primary {
  padding: var(--space-2) var(--space-5);
  border-radius: var(--radius-sm);
  background: var(--color-brand);
  color: #fff;
  font-size: 14px;
}

.car-detail__primary:hover {
  background: var(--color-brand-strong);
  color: #fff;
}

@media (max-width: 900px) {
  .car-detail__hero {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-5);
  }
}

@media (max-width: 640px) {
  .car-detail__price {
    font-size: 22px;
  }

  .car-detail__facts {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
