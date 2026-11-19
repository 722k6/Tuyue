import { EnergyType, PublishStatus, type CarSummary } from '@tuyue/contracts';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CAR_PAGE_SIZE_OPTIONS,
  DEFAULT_CAR_PAGE_SIZE,
  parsePage,
  parsePageSize,
  useCarListStore,
} from '../src/features/car/car-list.store';

function makeCar(index: number, publishStatus: PublishStatus = PublishStatus.PUBLISHED): CarSummary {
  return {
    id: `car-${index}`,
    name: `车型 ${index}`,
    series: '测试系列',
    energyType: EnergyType.GASOLINE,
    tagline: '用于列表分页测试',
    thumbnailUrl: '',
    priceMinCents: 10_000_000,
    priceMaxCents: 12_000_000,
    publishStatus,
  };
}

function stubCars(cars: CarSummary[]): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: cars, requestId: 'req-cars' }),
    }),
  );
}

describe('前台车型列表 store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.unstubAllGlobals();
  });

  it('只保留已上架车型，下架车型不进入列表', async () => {
    stubCars([makeCar(1), makeCar(2, PublishStatus.OFFLINE), makeCar(3, PublishStatus.DRAFT)]);
    const store = useCarListStore();

    await store.load();

    expect(store.status).toBe('ready');
    expect(store.items.map((car) => car.id)).toEqual(['car-1']);
    expect(store.total).toBe(1);
  });

  it('按每页条数切页，并给出正确的区间与页数', async () => {
    stubCars(Array.from({ length: 7 }, (_, index) => makeCar(index + 1)));
    const store = useCarListStore();

    await store.load();
    store.setPageSize(6);

    expect(store.pageCount).toBe(2);
    expect(store.pagedItems).toHaveLength(6);
    expect([store.rangeStart, store.rangeEnd]).toEqual([1, 6]);

    store.setPage(2);

    expect(store.pagedItems.map((car) => car.id)).toEqual(['car-7']);
    expect([store.rangeStart, store.rangeEnd]).toEqual([7, 7]);
  });

  it('页码越界时收回到有效范围，不会停在空页上', async () => {
    stubCars(Array.from({ length: 3 }, (_, index) => makeCar(index + 1)));
    const store = useCarListStore();

    await store.load();
    store.setPage(9);

    expect(store.page).toBe(1);
    expect(store.pagedItems).toHaveLength(3);
  });

  it('切换每页条数后回到第 1 页', async () => {
    stubCars(Array.from({ length: 7 }, (_, index) => makeCar(index + 1)));
    const store = useCarListStore();

    await store.load();
    store.setPage(2);
    store.setPageSize(12);

    expect(store.pageSize).toBe(12);
    expect(store.page).toBe(1);
  });

  it('从查询参数恢复分页状态，非法值退回默认值', async () => {
    stubCars(Array.from({ length: 12 }, (_, index) => makeCar(index + 1)));
    const store = useCarListStore();

    store.applyQuery({ page: '2', pageSize: '6' });
    await store.load();

    expect(store.page).toBe(2);
    expect(store.pageSize).toBe(6);
    expect(store.pagedItems).toHaveLength(6);

    store.applyQuery({ page: '0', pageSize: '999' });

    expect(store.page).toBe(1);
    expect(store.pageSize).toBe(DEFAULT_CAR_PAGE_SIZE);
  });

  it('接口失败时给出错误态与可读文案', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    const store = useCarListStore();

    await store.load();

    expect(store.status).toBe('error');
    expect(store.items).toEqual([]);
    expect(store.errorMessage).not.toBe('');
  });

  it('分页参数解析：只接受白名单内的每页条数', () => {
    expect(parsePage('3')).toBe(3);
    expect(parsePage('-1')).toBe(1);
    expect(parsePage('abc')).toBe(1);

    expect(parsePageSize('9')).toBe(9);
    expect(parsePageSize('7')).toBe(DEFAULT_CAR_PAGE_SIZE);
    expect(CAR_PAGE_SIZE_OPTIONS).toContain(DEFAULT_CAR_PAGE_SIZE);
  });
});
