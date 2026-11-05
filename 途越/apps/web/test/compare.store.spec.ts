// @vitest-environment jsdom
import {
  COMPARE_MAX_SIZE,
  EnergyType,
  PublishStatus,
  type CarSummary,
  type CompareMatrixResponse,
  type CompareSelectionItem,
} from '@tuyue/contracts';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { COMPARE_STORAGE_KEY } from '../src/features/compare/compare.storage';
import { useCompareStore } from '../src/features/compare/compare.store';

function car(id: string, name = `车型 ${id}`): CarSummary {
  return {
    id,
    name,
    series: '演示系列',
    energyType: EnergyType.GASOLINE,
    tagline: '用于测试',
    thumbnailUrl: `/mock/${id}.webp`,
    priceMinCents: 18_990_000,
    priceMaxCents: 23_990_000,
    publishStatus: PublishStatus.PUBLISHED,
  };
}

function item(carId: string, name = `车型 ${carId}`): CompareSelectionItem {
  return { carId, addedAt: '2026-11-04T00:00:00.000Z', car: car(carId, name) };
}

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body };
}

const matrix: CompareMatrixResponse = {
  carIds: ['ty-suv-001', 'ty-ev-001'],
  columns: [],
  groups: [],
  totalRows: 0,
  differentRows: 0,
  missingCells: 0,
};

describe('compare store（US-CMP-01 加入对比与对比栏）', () => {
  beforeEach(() => {
    window.localStorage.clear();
    setActivePinia(createPinia());
    vi.unstubAllGlobals();
  });

  it('加入对比后立刻出现在对比栏，并写入本地副本', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ success: true, data: { visitorId: 'v1', maxSize: 4, items: [item('ty-suv-001')] }, requestId: 'req' })));

    const store = useCompareStore();
    const added = await store.add(car('ty-suv-001'));

    expect(added).toBe(true);
    expect(store.count).toBe(1);
    expect(store.items[0]?.car.name).toBe('车型 ty-suv-001');
    expect(window.localStorage.getItem(COMPARE_STORAGE_KEY)).toContain('ty-suv-001');
  });

  it('最多 4 台：第 5 台被拦在本地，不发起请求', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        success: true,
        data: { visitorId: 'v1', maxSize: COMPARE_MAX_SIZE, items: [] },
        requestId: 'req',
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const store = useCompareStore();
    // 直接铺满 4 台，避免依赖服务端返回内容
    for (const id of ['a', 'b', 'c', 'd']) {
      store.items.push(item(id));
    }

    const added = await store.add(car('e'));

    expect(added).toBe(false);
    expect(store.count).toBe(COMPARE_MAX_SIZE);
    expect(store.notice).toContain('最多同时对比');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('重复加入同一台车给出提示且不重复入列', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ success: true, data: { visitorId: 'v1', maxSize: 4, items: [item('ty-ev-001')] }, requestId: 'req' })));

    const store = useCompareStore();
    await store.add(car('ty-ev-001'));
    const again = await store.add(car('ty-ev-001'));

    expect(again).toBe(false);
    expect(store.count).toBe(1);
    expect(store.notice).toContain('已经在对比清单里');
  });

  it('服务端拒绝（如已下架）时回滚本地，不留脏数据', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            success: false,
            error: { code: 'CAR_NOT_PUBLISHED', message: '该车型已下架，无法加入对比' },
            requestId: 'req',
          },
          false,
          409,
        ),
      ),
    );

    const store = useCompareStore();
    const added = await store.add(car('ty-legacy-001'));

    expect(added).toBe(false);
    expect(store.items).toEqual([]);
    expect(store.notice).toBe('该车型已下架，无法加入对比');
  });

  it('断网时保留本地对比，提示稍后同步', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    const store = useCompareStore();
    const added = await store.add(car('ty-mpv-001'));

    expect(added).toBe(true);
    expect(store.count).toBe(1);
    expect(store.serverSynced).toBe(false);
    expect(store.notice).toContain('联网后自动同步');
  });

  it('刷新后从本地恢复对比栏，再与服务端合并去重', async () => {
    window.localStorage.setItem(
      COMPARE_STORAGE_KEY,
      JSON.stringify([item('ty-suv-001'), item('ty-ev-001')]),
    );
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          success: true,
          data: {
            visitorId: 'v1',
            maxSize: 4,
            items: [item('ty-ev-001'), item('ty-hybrid-001')],
          },
          requestId: 'req',
        }),
      ),
    );

    const store = useCompareStore();
    expect(store.count).toBe(2);

    await store.load();

    expect(store.carIds).toEqual(['ty-suv-001', 'ty-ev-001', 'ty-hybrid-001']);
    expect(store.status).toBe('ready');
  });

  it('服务端不可用时不清空本地对比', async () => {
    window.localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify([item('ty-suv-001')]));
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    const store = useCompareStore();
    await store.load();

    expect(store.count).toBe(1);
    expect(store.status).toBe('ready');
  });

  it('移除对比项后本地与服务端同步', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          success: true,
          data: { visitorId: 'v1', maxSize: 4, items: [item('ty-suv-001'), item('ty-ev-001')] },
          requestId: 'req',
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          success: true,
          data: { visitorId: 'v1', maxSize: 4, items: [item('ty-ev-001')] },
          requestId: 'req',
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const store = useCompareStore();
    await store.add(car('ty-ev-001'));
    await store.remove('ty-suv-001');

    expect(store.carIds).toEqual(['ty-ev-001']);
  });

  it('至少两台才能进入对比', async () => {
    const picked: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (String(url).includes('/compare/items') && init?.body) {
          picked.push((JSON.parse(String(init.body)) as { carId: string }).carId);
        }
        return Promise.resolve(
          jsonResponse({
            success: true,
            data: { visitorId: 'v1', maxSize: COMPARE_MAX_SIZE, items: picked.map((id) => item(id)) },
            requestId: 'req',
          }),
        );
      }),
    );

    const store = useCompareStore();
    await store.add(car('ty-suv-001'));

    expect(store.canCompare).toBe(false);
    await store.add(car('ty-ev-001'));
    expect(store.canCompare).toBe(true);
  });
});

describe('compare store（US-CMP-02 对比矩阵）', () => {
  beforeEach(() => {
    window.localStorage.clear();
    setActivePinia(createPinia());
    vi.unstubAllGlobals();
  });

  it('按车型 ID 拉取并集矩阵', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ success: true, data: matrix, requestId: 'req' })));

    const store = useCompareStore();
    await store.loadMatrix(['ty-suv-001', 'ty-ev-001']);

    expect(store.matrixStatus).toBe('ready');
    expect(store.matrix?.carIds).toEqual(['ty-suv-001', 'ty-ev-001']);
  });

  it('矩阵请求失败时进入 error 状态，页面可提示重试', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ success: false, error: { code: 'HTTP_ERROR', message: '请求失败' }, requestId: 'req' }, false, 500)));

    const store = useCompareStore();
    await store.loadMatrix(['ty-suv-001']);

    expect(store.matrixStatus).toBe('error');
    expect(store.matrix).toBeNull();
  });
});
