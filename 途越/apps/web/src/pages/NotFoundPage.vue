<script setup lang="ts">
/** 兜底 404：地址写错或旧链接失效时，给一条明确的回程路，而不是白屏。 */
</script>

<template>
  <section class="not-found">
    <p class="not-found__code">404</p>
    <h1>页面不存在</h1>
    <p class="not-found__text">这个地址可能已经调整，或链接有误。可以去车型列表重新找一台车。</p>
    <div class="not-found__actions">
      <RouterLink to="/cars" class="not-found__primary">浏览车型</RouterLink>
      <RouterLink to="/" class="not-found__link">回到首页</RouterLink>
    </div>
  </section>
</template>

<style scoped>
.not-found {
  display: grid;
  justify-items: center;
  gap: var(--space-2);
  padding: var(--space-8) var(--space-5);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  text-align: center;
}

.not-found__code {
  margin: 0;
  font-size: 64px;
  font-weight: 800;
  line-height: 1;
  color: var(--color-line);
}

.not-found h1 {
  margin: 0;
}

.not-found__text {
  margin: 0 0 var(--space-4);
  max-width: 46ch;
  color: var(--color-ink-muted);
}

.not-found__actions {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.not-found__primary {
  padding: var(--space-2) var(--space-5);
  border-radius: var(--radius-sm);
  background: var(--color-brand);
  color: #fff;
  font-size: 14px;
}

.not-found__primary:hover {
  background: var(--color-brand-strong);
  color: #fff;
}

.not-found__link {
  font-size: 13px;
  color: var(--color-ink-muted);
}
</style>
