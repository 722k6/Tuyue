import { CarParameterGroup, EnergyType, PublishStatus, type CarDetail } from '@tuyue/contracts';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCarDetailStore } from '../src/features/car/car-detail.store';

const car: CarDetail = {
  id: 'ty-suv-001',
  name: '途越远行',
  series: '远行系列',
  energyType: EnergyType.GASOLINE,
  tagline: '从容应对每一段旅程',
  thumbnailUrl: '',
  priceMinCents: 18_990_000,
  priceMaxCents: 23_990_000,
  publishStatus: PublishStatus.PUBLISHED,
  galleryUrls: [],
  images: [],
  description: '详情页测试数据',
  parameters: [
    { code: 'power', label: '最大功率', value: '185', unit: 'kW', group: CarParameterGroup.POWER },
  ],
  configOptions: [],
  updatedAt: '2026-10-27T00:00:00.000Z',
};

describe('车型详情 store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.unstubAllGlobals();
  });

  it('取到详情后进入 ready 并携带完整字段', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: car, requestId: 'req-detail' }),
      }),
    );
    const store = useCarDetailStore();

    await store.load('ty-suv-001');

    expect(store.status).toBe('ready');
    expect(store.car?.name).toBe('途越远行');
    expect(store.car?.parameters).toHaveLength(1);
  });

  it('接口 404 落 notFound 分支，而不是报错分支', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    const store = useCarDetailStore();

    await store.load('ty-legacy-001');

    expect(store.status).toBe('notFound');
    expect(store.car).toBeUndefined();
    expect(store.errorMessage).toContain('不存在');
  });

  it('接口 5xx 落错误分支，允许重试', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    const store = useCarDetailStore();

    await store.load('ty-suv-001');

    expect(store.status).toBe('error');
    expect(store.errorMessage).toContain('重试');
  });

  it('连续切换车型时只保留最后一次请求的结果', async () => {
    const slow = { ...car, id: 'car-slow', name: '慢车' };
    const fast = { ...car, id: 'car-fast', name: '快车' };
    let resolveSlow: (value: unknown) => void = () => {};
    const slowPromise = new Promise((resolve) => {
      resolveSlow = resolve;
    });

    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockReturnValueOnce(slowPromise)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: fast, requestId: 'req-fast' }),
        }),
    );
    const store = useCarDetailStore();

    const first = store.load('car-slow');
    await store.load('car-fast');
    resolveSlow({ ok: true, json: async () => ({ success: true, data: slow, requestId: 'req-slow' }) });
    await first;

    expect(store.car?.id).toBe('car-fast');
    expect(store.status).toBe('ready');
  });
});
