<script setup lang="ts">
/**
 * 加载骨架。
 *
 * 用结构相同的灰块占位而不是一句「加载中…」：首屏切换时页面高度不会突然塌掉，
 * 内容回来时也不会把用户正在看的位置顶走。
 */
withDefaults(defineProps<{ count?: number; variant?: 'card' | 'detail' }>(), {
  count: 3,
  variant: 'card',
});
</script>

<template>
  <div
    class="skeleton"
    :class="`skeleton--${variant}`"
    aria-busy="true"
    aria-live="polite"
  >
    <span class="sr-only">正在加载内容</span>
    <div v-for="index in count" :key="index" class="skeleton__item" aria-hidden="true">
      <div class="skeleton__media" />
      <div class="skeleton__line skeleton__line--title" />
      <div class="skeleton__line" />
      <div class="skeleton__line skeleton__line--short" />
    </div>
  </div>
</template>

<style scoped>
.skeleton {
  display: grid;
  gap: var(--space-4);
}

.skeleton--card {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.skeleton--detail {
  grid-template-columns: 1.2fr 1fr;
}

.skeleton__item {
  padding: var(--space-3);
  border: 1px solid var(--color-line-soft);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.skeleton__media {
  height: 150px;
  border-radius: var(--radius-md);
  background: var(--color-surface-muted);
}

.skeleton__line {
  height: 12px;
  margin-top: var(--space-3);
  border-radius: var(--radius-pill);
  background: var(--color-surface-muted);
}

.skeleton__line--title {
  width: 55%;
  height: 16px;
}

.skeleton__line--short {
  width: 35%;
}

.skeleton__media,
.skeleton__line {
  animation: skeleton-pulse 1.4s ease-in-out infinite;
}

@keyframes skeleton-pulse {
  0%,
  100% {
    opacity: 0.55;
  }

  50% {
    opacity: 1;
  }
}

@media (max-width: 900px) {
  .skeleton--card,
  .skeleton--detail {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .skeleton--card,
  .skeleton--detail {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton__media,
  .skeleton__line {
    animation: none;
  }
}
</style>
