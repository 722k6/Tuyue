import type { DealerDto } from '@tuyue/contracts';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { LoadStatus } from '../../shared/load-status';
import { fetchDealers } from './dealer.api';
import type { MapMarker } from './map';

export const useDealerStore = defineStore('dealer', () => {
  const items = ref<DealerDto[]>([]);
  const status = ref<LoadStatus>('idle');
  const selectedId = ref<string | null>(null);

  const markers = computed<MapMarker[]>(() =>
    items.value.map((dealer) => ({
      id: dealer.id,
      name: dealer.name,
      longitude: dealer.longitude,
      latitude: dealer.latitude,
    })),
  );

  const selected = computed(
    () => items.value.find((dealer) => dealer.id === selectedId.value) ?? null,
  );

  async function load(): Promise<void> {
    status.value = 'loading';
    try {
      items.value = await fetchDealers();
      status.value = 'ready';
      selectedId.value = items.value[0]?.id ?? null;
    } catch {
      status.value = 'error';
    }
  }

  function select(id: string): void {
    selectedId.value = id;
  }

  return { items, status, selectedId, markers, selected, load, select };
});
