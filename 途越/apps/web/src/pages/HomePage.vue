<script setup lang="ts">
import { onMounted } from 'vue';
import { useHealthStore } from '../stores/health';

const health = useHealthStore();
onMounted(() => health.check());
</script>

<template>
  <section>
    <p class="eyebrow">TUYUE AUTO</p>
    <h1>途越汽车官网工程基线</h1>
    <p>用于车型展示、AI 选车与购车决策能力的并行开发。</p>
    <p class="status" :data-status="health.status">Mock API：{{ health.status }}</p>
  </section>
</template>
