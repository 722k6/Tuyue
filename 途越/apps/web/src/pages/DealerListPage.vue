<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { TrackEventName, track } from '../analytics/track';
import { useDealerStore } from '../features/dealer/dealer.store';
import { createMapProvider, type MapProvider } from '../features/dealer/map';

const dealer = useDealerStore();
const mapContainer = ref<HTMLElement | null>(null);
let provider: MapProvider | null = null;

function drawMap(): void {
  if (!provider || !mapContainer.value) return;
  provider.render(mapContainer.value, dealer.markers, {
    focusId: dealer.selectedId ?? undefined,
    onMarkerClick: (id) => dealer.select(id),
  });
}

onMounted(async () => {
  await track(TrackEventName.PAGE_VIEW, { page: 'dealers' });
  provider = createMapProvider();
  await dealer.load();
  drawMap();
});

watch(() => [dealer.selectedId, dealer.markers.length], drawMap);

onBeforeUnmount(() => {
  provider?.destroy();
  provider = null;
});
</script>

<template>
  <section>
    <h1>经销商</h1>
    <p v-if="dealer.status === 'loading'">加载中…</p>
    <p v-else-if="dealer.status === 'error'">经销商加载失败，请稍后重试。</p>
    <div v-else class="dealer-layout">
      <div ref="mapContainer" class="dealer-layout__map" aria-label="经销商地图" />
      <ul class="dealer-list">
        <li
          v-for="item in dealer.items"
          :key="item.id"
          class="dealer-card"
          :data-selected="item.id === dealer.selectedId"
          @click="dealer.select(item.id)"
        >
          <h2>{{ item.name }}</h2>
          <p>{{ item.address }}</p>
          <p class="dealer-card__meta">{{ item.phone }} · {{ item.businessHours }}</p>
        </li>
      </ul>
    </div>
  </section>
</template>
