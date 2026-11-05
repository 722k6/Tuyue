<script setup lang="ts">
import { COMPARE_MAX_SIZE, type CarSummary } from '@tuyue/contracts';
import { computed } from 'vue';
import { useCompareStore } from './compare.store';

const props = defineProps<{ car: CarSummary }>();
const store = useCompareStore();

const selected = computed(() => store.has(props.car.id));
const blocked = computed(() => !selected.value && store.isFull);
const label = computed(() => {
  if (selected.value) return '已加入对比';
  if (blocked.value) return `对比已满 ${COMPARE_MAX_SIZE} 台`;
  return '加入对比';
});

async function toggle(): Promise<void> {
  if (selected.value) {
    await store.remove(props.car.id);
    return;
  }
  await store.add(props.car);
}
</script>

<template>
  <button
    type="button"
    class="compare-toggle"
    :class="{ 'is-selected': selected, 'is-blocked': blocked }"
    :data-car-id="car.id"
    :data-selected="selected ? 'true' : 'false'"
    :disabled="blocked"
    @click="toggle"
  >
    {{ label }}
  </button>
</template>

<style scoped>
.compare-toggle {
  border: 1px solid #c9d4e0;
  background: #fff;
  color: #2457a7;
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 13px;
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease,
    border-color 0.15s ease;
}
.compare-toggle:hover:not(:disabled) {
  border-color: #2457a7;
}
.compare-toggle.is-selected {
  background: #2457a7;
  border-color: #2457a7;
  color: #fff;
}
.compare-toggle.is-blocked,
.compare-toggle:disabled {
  background: #f1f4f8;
  border-color: #dfe6ee;
  color: #94a3b8;
  cursor: not-allowed;
}
</style>
