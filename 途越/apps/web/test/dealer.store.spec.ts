// @vitest-environment jsdom
import type { DealerDto } from '@tuyue/contracts';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDealerStore } from '../src/features/dealer/dealer.store';
import { createMapProvider } from '../src/features/dealer/map';

const dealers: DealerDto[] = [
  {
    id: 'dealer-sh-001',
    name: '途越上海体验中心',
    address: '上海市示例路 100 号',
    longitude: 121.4737,
    latitude: 31.2304,
    phone: '400-000-0001',
    businessHours: '09:00-18:00',
  },
  {
    id: 'dealer-bj-001',
    name: '途越北京体验中心',
    address: '北京市示例路 200 号',
    longitude: 116.4074,
    latitude: 39.9042,
    phone: '400-000-0002',
    businessHours: '09:00-18:00',
  },
];

describe('dealer store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.unstubAllGlobals();
  });

  it('builds map markers from dealers and preselects the first one', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: dealers, requestId: 'req-dealer' }),
      }),
    );

    const store = useDealerStore();
    await store.load();

    expect(store.status).toBe('ready');
    expect(store.selectedId).toBe('dealer-sh-001');
    expect(store.markers).toEqual([
      { id: 'dealer-sh-001', name: '途越上海体验中心', longitude: 121.4737, latitude: 31.2304 },
      { id: 'dealer-bj-001', name: '途越北京体验中心', longitude: 116.4074, latitude: 39.9042 },
    ]);
    expect(store.selected?.phone).toBe('400-000-0001');
  });

  it('switches the selected dealer', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: dealers, requestId: 'req-dealer' }),
      }),
    );

    const store = useDealerStore();
    await store.load();
    store.select('dealer-bj-001');

    expect(store.selected?.name).toBe('途越北京体验中心');
  });
});

describe('map provider', () => {
  it('renders markers with the mock provider and forwards clicks', () => {
    const container = document.createElement('div');
    const provider = createMapProvider();
    const clicked: string[] = [];

    provider.render(
      container,
      [{ id: 'dealer-sh-001', name: '途越上海体验中心', longitude: 121.4737, latitude: 31.2304 }],
      { focusId: 'dealer-sh-001', onMarkerClick: (id) => clicked.push(id) },
    );

    const marker = container.querySelector<HTMLButtonElement>('[data-marker-id="dealer-sh-001"]');
    expect(marker).toBeInstanceOf(HTMLButtonElement);
    expect(marker?.dataset.focused).toBe('true');

    marker?.click();
    expect(clicked).toEqual(['dealer-sh-001']);
  });

  it('removes its DOM on destroy so provider switches leave no leftovers', () => {
    const container = document.createElement('div');
    const provider = createMapProvider();

    provider.render(container, []);
    expect(container.querySelector('.mock-map')).not.toBeNull();

    provider.destroy();
    expect(container.querySelector('.mock-map')).toBeNull();
  });

  it('refuses providers that are not implemented yet', () => {
    expect(() => createMapProvider('amap')).toThrow(/尚未接入/);
  });
});
