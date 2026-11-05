<script setup lang="ts">
import CompareBar from './features/compare/CompareBar.vue';
</script>

<template>
  <header>
    <RouterLink to="/" class="brand">途越汽车</RouterLink>
    <nav>
      <RouterLink to="/cars">车型</RouterLink><RouterLink to="/ai">AI 选车</RouterLink
      ><RouterLink to="/compare">车型对比</RouterLink>
    </nav>
  </header>
  <main><RouterView /></main>
  <!-- 全局悬浮对比栏（US-CMP-01）：任何页面都能看到当前选择与 4 台上限 -->
  <CompareBar />
</template>
