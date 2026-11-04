<script setup lang="ts">
import type { CarSummary } from '@tuyue/contracts';
import { onMounted, ref } from 'vue';
import CompareToggle from '../features/compare/CompareToggle.vue';
import { webApi } from '../api';

const cars = ref<CarSummary[]>([]);
const error = ref('');
onMounted(async () => {
  try {
    cars.value = (await webApi.cars()).data;
  } catch {
    error.value = '车型 Mock API 暂时不可用';
  }
});
</script>

<template>
  <section>
    <h1>车型列表</h1>
    <p v-if="error">
      {{ error }}
    </p>
    <div class="grid">
      <article v-for="car in cars" :key="car.id">
        <p>{{ car.series }}</p>
        <h2>{{ car.name }}</h2>
        <p>{{ car.tagline }}</p>
        <div class="card-actions">
          <RouterLink :to="`/cars/${car.id}`">查看占位详情</RouterLink>
          <CompareToggle :car="car" />
        </div>
      </article>
    </div>
  </section>
</template>
