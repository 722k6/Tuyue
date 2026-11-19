<script setup lang="ts">
import { computed, ref, watch } from 'vue';

/**
 * 车型图集轮播（US-CAR-02）。
 *
 * 三种情况的处理：
 * - 有图：主图 + 缩略图 + 左右切换 + 计数，支持键盘左右方向键；
 * - 图片地址失效：单张失败只把它从列表里剔除，其余仍可浏览，全部失败才显示占位块；
 * - 没图：整块退回占位，不留一个破图图标。
 */
const props = defineProps<{
  name: string;
  images: Array<{ id?: string; url: string }>;
}>();

const failedUrls = ref<string[]>([]);
const index = ref(0);

const usable = computed(() =>
  props.images.filter((image) => image.url && !failedUrls.value.includes(image.url)),
);
const total = computed(() => usable.value.length);
const current = computed(() => usable.value[index.value]);

watch(total, (count) => {
  if (index.value >= count) index.value = 0;
});

function markFailed(url: string): void {
  if (!failedUrls.value.includes(url)) failedUrls.value = [...failedUrls.value, url];
}

function step(offset: number): void {
  if (total.value === 0) return;
  index.value = (index.value + offset + total.value) % total.value;
}
</script>

<template>
  <figure class="gallery">
    <div
      v-if="current"
      class="gallery__stage"
      tabindex="0"
      role="group"
      :aria-label="`${name} 图集，共 ${total} 张`"
      @keydown.left.prevent="step(-1)"
      @keydown.right.prevent="step(1)"
    >
      <img
        :src="current.url"
        :alt="`${name} 图集第 ${index + 1} 张`"
        class="gallery__image"
        @error="markFailed(current.url)"
      />

      <template v-if="total > 1">
        <button
          type="button"
          class="gallery__nav gallery__nav--prev"
          aria-label="上一张"
          @click="step(-1)"
        >
          ‹
        </button>
        <button
          type="button"
          class="gallery__nav gallery__nav--next"
          aria-label="下一张"
          @click="step(1)"
        >
          ›
        </button>
      </template>

      <span class="gallery__counter">{{ index + 1 }} / {{ total }}</span>
    </div>

    <div v-else class="gallery__stage gallery__stage--empty" role="img" :aria-label="`${name} 暂无图片`">
      <span class="gallery__placeholder" aria-hidden="true">{{ name }}</span>
      <span class="gallery__placeholder-hint">图片整理中</span>
    </div>

    <div v-if="total > 1" class="gallery__thumbs">
      <button
        v-for="(image, position) in usable"
        :key="image.url"
        type="button"
        class="gallery__thumb"
        :class="{ 'is-current': position === index }"
        :aria-label="`查看第 ${position + 1} 张图`"
        :aria-current="position === index ? 'true' : undefined"
        :data-index="position"
        @click="index = position"
      >
        <img :src="image.url" alt="" @error="markFailed(image.url)" />
      </button>
    </div>
  </figure>
</template>

<style scoped>
.gallery {
  margin: 0;
}

.gallery__stage {
  position: relative;
  display: grid;
  place-items: center;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  border-radius: var(--radius-lg);
  background: var(--color-surface-muted);
}

.gallery__stage--empty {
  gap: var(--space-2);
  background:
    radial-gradient(circle at 20% 16%, rgb(89 211 196 / 40%), transparent 56%),
    linear-gradient(135deg, #1f3350 0%, #2457a7 100%);
}

.gallery__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.gallery__placeholder {
  font-size: 20px;
  font-weight: 600;
  letter-spacing: 0.14em;
  color: rgb(255 255 255 / 85%);
}

.gallery__placeholder-hint {
  font-size: 12px;
  letter-spacing: 0.08em;
  color: rgb(255 255 255 / 60%);
}

.gallery__nav {
  position: absolute;
  top: 50%;
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  transform: translateY(-50%);
  border: 0;
  border-radius: 50%;
  background: rgb(16 26 36 / 45%);
  color: #fff;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  transition: background 0.15s ease;
}

.gallery__nav:hover {
  background: rgb(16 26 36 / 70%);
}

.gallery__nav--prev {
  left: var(--space-3);
}

.gallery__nav--next {
  right: var(--space-3);
}

.gallery__counter {
  position: absolute;
  right: var(--space-3);
  bottom: var(--space-3);
  padding: 2px var(--space-2);
  border-radius: var(--radius-pill);
  background: rgb(16 26 36 / 55%);
  font-size: 12px;
  color: #fff;
}

.gallery__thumbs {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-3);
  overflow-x: auto;
  padding-bottom: var(--space-1);
}

.gallery__thumb {
  flex: 0 0 84px;
  width: 84px;
  height: 56px;
  padding: 0;
  overflow: hidden;
  border: 2px solid transparent;
  border-radius: var(--radius-sm);
  background: var(--color-surface-muted);
  cursor: pointer;
}

.gallery__thumb.is-current {
  border-color: var(--color-brand);
}

.gallery__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

@media (max-width: 640px) {
  .gallery__thumb {
    flex-basis: 64px;
    width: 64px;
    height: 44px;
  }
}
</style>
