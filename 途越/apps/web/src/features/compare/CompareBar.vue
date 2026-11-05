<script setup lang="ts">
import { COMPARE_MAX_SIZE } from '@tuyue/contracts';
import { onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useCompareStore } from './compare.store';

/**
 * 顶部悬浮对比栏（US-CMP-01）。
 *
 * 只要对比清单非空就常驻，让「我选了几台、还差几台能对比」一直可见——
 * 选车是跨页面的行为，用户很可能在列表页加一台、详情页再加一台，
 * 如果只在列表页显示入口，第二台车就很容易被忘掉。
 */
const store = useCompareStore();
const route = useRoute();
const router = useRouter();

onMounted(() => void store.load());

function goCompare(): void {
  if (!store.canCompare) {
    store.notice = '至少选择 2 台车型才能开始对比';
    return;
  }
  void router.push('/compare');
}
</script>

<template>
  <aside v-if="store.count > 0 && route.path !== '/compare'" class="compare-bar" aria-label="车型对比栏">
    <div class="compare-bar__list">
      <span class="compare-bar__count">对比 {{ store.count }}/{{ COMPARE_MAX_SIZE }}</span>
      <span
        v-for="item in store.items"
        :key="item.carId"
        class="compare-bar__item"
        :data-car-id="item.carId"
      >
        {{ item.car.name }}
        <button
          type="button"
          class="compare-bar__remove"
          :aria-label="`从对比中移除 ${item.car.name}`"
          @click="store.remove(item.carId)"
        >
          ×
        </button>
      </span>
    </div>

    <div class="compare-bar__actions">
      <span v-if="!store.canCompare" class="compare-bar__hint">再选 1 台即可对比</span>
      <button type="button" class="compare-bar__ghost" @click="store.clear()">清空</button>
      <button
        type="button"
        class="compare-bar__primary"
        :disabled="!store.canCompare"
        @click="goCompare"
      >
        开始对比
      </button>
    </div>

    <p v-if="store.notice" class="compare-bar__notice" role="status">
      {{ store.notice }}
      <button type="button" class="compare-bar__notice-close" @click="store.clearNotice()">关闭</button>
    </p>
  </aside>
</template>

<style scoped>
.compare-bar {
  position: fixed;
  left: 50%;
  bottom: 20px;
  transform: translateX(-50%);
  width: min(1000px, calc(100vw - 32px));
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  padding: 12px 16px;
  border-radius: 14px;
  background: #101a24;
  color: #f5f8fb;
  box-shadow: 0 18px 40px rgb(16 26 36 / 28%);
  z-index: 50;
}
.compare-bar__list {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  flex-wrap: wrap;
}
.compare-bar__count {
  font-size: 13px;
  color: #93a4b5;
  margin-right: 4px;
}
.compare-bar__item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px 4px 10px;
  border-radius: 999px;
  background: #1f2f3f;
  font-size: 13px;
}
.compare-bar__remove {
  border: 0;
  background: transparent;
  color: #93a4b5;
  cursor: pointer;
  font-size: 15px;
  line-height: 1;
  padding: 0 2px;
}
.compare-bar__remove:hover {
  color: #fff;
}
.compare-bar__actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
.compare-bar__hint {
  font-size: 12px;
  color: #93a4b5;
}
.compare-bar__ghost {
  border: 1px solid #33465a;
  background: transparent;
  color: #cbd6e2;
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 13px;
  cursor: pointer;
}
.compare-bar__primary {
  border: 0;
  border-radius: 8px;
  padding: 7px 16px;
  font-size: 13px;
  font-weight: 600;
  color: #08131d;
  background: #59d3c4;
  cursor: pointer;
}
.compare-bar__primary:disabled {
  background: #2b3b4b;
  color: #7d8d9d;
  cursor: not-allowed;
}
.compare-bar__notice {
  flex-basis: 100%;
  margin: 0;
  font-size: 12px;
  color: #ffd6a5;
}
.compare-bar__notice-close {
  margin-left: 8px;
  border: 0;
  background: transparent;
  color: #93a4b5;
  cursor: pointer;
  font-size: 12px;
}

@media (max-width: 640px) {
  .compare-bar {
    bottom: 12px;
    padding: 10px 12px;
    gap: 10px;
  }
  .compare-bar__actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
