<script setup lang="ts">
import type { CarSummary } from '@tuyue/contracts';
import { ref } from 'vue';
import CompareToggle from '../features/compare/CompareToggle.vue';
import { energyLabel } from '../features/car/car-labels';
import { formatPriceRange } from '../shared/format';

/**
 * 车型卡片（US-CAR-01）。
 *
 * 图片走 `@error` 兜底：CMS 刚建、图还没传的车型，`thumbnailUrl` 是空串或死链。
 * 直接露出浏览器的碎图标比没有图更糟，所以失败后退回一块带系列名的色块。
 */
defineProps<{ car: CarSummary }>();

const imageFailed = ref(false);
</script>

<template>
  <article class="car-card" :data-car-id="car.id">
    <RouterLink
      :to="`/cars/${car.id}`"
      class="car-card__media"
      :aria-label="`查看 ${car.name} 的车型详情`"
      tabindex="-1"
    >
      <img
        v-if="car.thumbnailUrl && !imageFailed"
        :src="car.thumbnailUrl"
        :alt="`${car.name} 车型外观`"
        loading="lazy"
        class="car-card__image"
        @error="imageFailed = true"
      />
      <span v-else class="car-card__image car-card__image--fallback" aria-hidden="true">
        <span class="car-card__image-text">{{ car.series }}</span>
      </span>
      <span class="car-card__energy">{{ energyLabel(car.energyType) }}</span>
    </RouterLink>

    <div class="car-card__body">
      <p class="car-card__series">{{ car.series }}</p>
      <h2 class="car-card__name">{{ car.name }}</h2>
      <p class="car-card__tagline">{{ car.tagline }}</p>
      <p class="car-card__price">{{ formatPriceRange(car.priceMinCents, car.priceMaxCents) }}</p>

      <div class="car-card__actions">
        <RouterLink :to="`/cars/${car.id}`" class="car-card__link">查看车型详情</RouterLink>
        <CompareToggle :car="car" />
      </div>
    </div>
  </article>
</template>

<style scoped>
.car-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--color-line-soft);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease;
}

.car-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.car-card__media {
  position: relative;
  display: block;
  aspect-ratio: 16 / 10;
  background: var(--color-surface-muted);
}

.car-card__image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.car-card__image--fallback {
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at 22% 18%, rgb(89 211 196 / 45%), transparent 58%),
    linear-gradient(135deg, #1f3350 0%, #2457a7 100%);
}

.car-card__image-text {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.16em;
  color: rgb(255 255 255 / 78%);
}

.car-card__energy {
  position: absolute;
  top: var(--space-3);
  left: var(--space-3);
  padding: 2px var(--space-2);
  border-radius: var(--radius-pill);
  background: rgb(255 255 255 / 90%);
  font-size: 12px;
  font-weight: 600;
  color: var(--color-brand-strong);
}

.car-card__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-4);
}

.car-card__series {
  margin: 0;
  font-size: 12px;
  letter-spacing: 0.08em;
  color: var(--color-ink-muted);
}

.car-card__name {
  margin: 0;
  font-size: 19px;
}

.car-card__tagline {
  margin: 0;
  font-size: 13px;
  color: var(--color-ink-muted);
  /* 卖点长短不一，压到两行保持卡片等高 */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.car-card__price {
  margin: var(--space-2) 0 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--color-ink);
}

.car-card__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-top: var(--space-4);
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-line-soft);
}

.car-card__link {
  font-size: 13px;
  font-weight: 600;
}

@media (max-width: 640px) {
  .car-card__media {
    aspect-ratio: 16 / 9;
  }
}
</style>
