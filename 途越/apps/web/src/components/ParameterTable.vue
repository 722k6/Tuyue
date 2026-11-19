<script setup lang="ts">
import type { CarParameter } from '@tuyue/contracts';
import { computed } from 'vue';
import { groupCarParameters } from '../features/car/car-parameters';

/**
 * 参数分组表（US-CAR-02）。
 *
 * 参数条数可能几十条，平铺成一张长表很难扫读，所以按固定分组切段，
 * 每段一个标题；分组顺序与对比表保持一致（见 car-parameters.ts）。
 */
const props = defineProps<{ parameters: CarParameter[] }>();

const sections = computed(() => groupCarParameters(props.parameters));
</script>

<template>
  <div class="parameter-table">
    <p v-if="sections.length === 0" class="parameter-table__empty">
      该车型的参数正在补充，暂时没有可展示的条目。
    </p>

    <section
      v-for="section in sections"
      :key="section.group"
      class="parameter-group"
      :data-group="section.group"
    >
      <h3 class="parameter-group__title">{{ section.label }}</h3>
      <dl class="parameter-group__rows">
        <div
          v-for="row in section.rows"
          :key="row.code"
          class="parameter-row"
          :data-code="row.code"
        >
          <dt>{{ row.label }}</dt>
          <dd>
            {{ row.value }}<span v-if="row.unit" class="parameter-row__unit">{{ row.unit }}</span>
          </dd>
        </div>
      </dl>
    </section>
  </div>
</template>

<style scoped>
.parameter-table {
  display: grid;
  gap: var(--space-6);
}

.parameter-table__empty {
  margin: 0;
  padding: var(--space-5);
  border: 1px dashed var(--color-line);
  border-radius: var(--radius-md);
  font-size: 14px;
  color: var(--color-ink-muted);
}

.parameter-group__title {
  margin: 0 0 var(--space-3);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--color-line);
  font-size: 15px;
  letter-spacing: 0.04em;
}

.parameter-group__rows {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 var(--space-6);
  margin: 0;
}

.parameter-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3) 0;
  border-bottom: 1px dashed var(--color-line-soft);
}

.parameter-row dt {
  font-size: 13px;
  color: var(--color-ink-muted);
}

.parameter-row dd {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  text-align: right;
  color: var(--color-ink);
}

.parameter-row__unit {
  margin-left: 2px;
  font-size: 12px;
  font-weight: 400;
  color: var(--color-ink-muted);
}

@media (max-width: 640px) {
  .parameter-group__rows {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
