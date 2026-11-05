<script setup lang="ts">
import type { CarDetail } from '@tuyue/contracts';
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import CompareToggle from '../features/compare/CompareToggle.vue';
import { webApi } from '../api';

const route = useRoute();
const car = ref<CarDetail>();
const error = ref('');
onMounted(async () => {
  try {
    car.value = (await webApi.car(String(route.params.id))).data;
  } catch {
    error.value = '未找到车型或 Mock API 暂时不可用';
  }
});
</script>

<template>
  <section>
    <h1>车型详情</h1>
    <p v-if="error">
      {{ error }}
    </p>
    <template v-if="car">
      <h2>{{ car.name }}</h2>
      <CompareToggle :car="car" />
      <p>{{ car.description }}</p>
      <p>车型 ID：{{ car.id }}</p>
    </template>
  </section>
</template>
