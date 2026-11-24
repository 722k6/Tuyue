<script setup lang="ts">
/**
 * 空态 / 错误态占位。
 *
 * 一个组件覆盖两种情况：列表没数据、接口失败。差别只在文案和有没有「重试」按钮，
 * 拆成两个组件会让「加载失败」和「暂无内容」的视觉规范日后各走各的。
 */
withDefaults(
  defineProps<{
    title: string;
    description?: string;
    tone?: 'empty' | 'error';
    actionLabel?: string;
  }>(),
  { description: '', tone: 'empty', actionLabel: '' },
);

defineEmits<{ action: [] }>();
</script>

<template>
  <div class="empty-state" :data-tone="tone" role="status">
    <p class="empty-state__title">{{ title }}</p>
    <p v-if="description" class="empty-state__description">{{ description }}</p>
    <button
      v-if="actionLabel"
      type="button"
      class="empty-state__action"
      @click="$emit('action')"
    >
      {{ actionLabel }}
    </button>
  </div>
</template>

<style scoped>
.empty-state {
  display: grid;
  justify-items: center;
  gap: var(--space-2);
  padding: var(--space-7) var(--space-5);
  border: 1px dashed var(--color-line);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  text-align: center;
}

.empty-state[data-tone='error'] {
  border-color: #f3c7c2;
  background: #fff8f7;
}

.empty-state__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-ink);
}

.empty-state[data-tone='error'] .empty-state__title {
  color: var(--color-danger);
}

.empty-state__description {
  margin: 0;
  max-width: 42ch;
  font-size: 14px;
  color: var(--color-ink-muted);
}

.empty-state__action {
  margin-top: var(--space-3);
  padding: var(--space-2) var(--space-5);
  border: 1px solid var(--color-brand);
  border-radius: var(--radius-sm);
  background: var(--color-brand);
  color: #fff;
  font-size: 14px;
  cursor: pointer;
}

.empty-state__action:hover {
  background: var(--color-brand-strong);
}
</style>
