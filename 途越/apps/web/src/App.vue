<script setup lang="ts">
import SiteFooter from './components/SiteFooter.vue';
import SiteHeader from './components/SiteHeader.vue';
import CompareBar from './features/compare/CompareBar.vue';
</script>

<template>
  <!-- 站点外壳（US-SYS-03）：页头 / 主内容 / 页脚三段式，各页面只关心中间那一段 -->
  <SiteHeader />
  <main id="main"><RouterView /></main>
  <SiteFooter />
  <!-- 全局悬浮对比栏（US-CMP-01）：任何页面都能看到当前选择与 4 台上限 -->
  <CompareBar />
</template>
