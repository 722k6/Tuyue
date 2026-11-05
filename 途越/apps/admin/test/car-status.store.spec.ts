// @vitest-environment jsdom
import {
  CarStatusAction,
  EnergyType,
  PublishStatus,
  type AdminCarListItem,
  type CarStatusAuditLog,
} from '@tuyue/contracts';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCarStatusStore } from '../src/features/car-status/car-status.store';

function car(id: string, publishStatus: PublishStatus, extra: Partial<AdminCarListItem> = {}): AdminCarListItem {
  return {
    id,
    name: `车型 ${id}`,
    series: '演示系列',
    energyType: EnergyType.GASOLINE,
    tagline: '用于测试',
    thumbnailUrl: `/mock/${id}.webp`,
    priceMinCents: 18_990_000,
    priceMaxCents: 23_990_000,
    publishStatus,
    updatedAt: '2026-11-04T10:00:00.000Z',
    auditLogCount: 0,
    ...extra,
  };
}

const log: CarStatusAuditLog = {
  id: 'status-log-1',
  carId: 'ty-legacy-001',
  carName: '车型 ty-legacy-001',
  action: CarStatusAction.PUBLISH,
  fromStatus: PublishStatus.OFFLINE,
  toStatus: PublishStatus.PUBLISHED,
  actor: '周子涵',
  reason: null,
  occurredAt: '2026-11-04T10:00:00.000Z',
};

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body };
}

describe('car status store（US-CAR-13 车型上下架）', () => {
  beforeEach(() => {
    window.localStorage.clear();
    setActivePinia(createPinia());
    vi.unstubAllGlobals();
  });

  it('加载后台车型列表并统计上架/未上架数量', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          success: true,
          data: [
            car('ty-suv-001', PublishStatus.PUBLISHED),
            car('ty-ev-001', PublishStatus.PUBLISHED),
            car('ty-legacy-001', PublishStatus.OFFLINE),
          ],
          requestId: 'req',
        }),
      ),
    );

    const store = useCarStatusStore();
    await store.load();

    expect(store.status).toBe('ready');
    expect(store.publishedCount).toBe(2);
    expect(store.offlineCount).toBe(1);
  });

  it('关键字与状态筛选同时生效', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          success: true,
          data: [
            car('ty-suv-001', PublishStatus.PUBLISHED),
            car('ty-legacy-001', PublishStatus.OFFLINE),
          ],
          requestId: 'req',
        }),
      ),
    );

    const store = useCarStatusStore();
    await store.load();

    store.keyword = 'legacy';
    expect(store.visibleItems.map((entry) => entry.id)).toEqual(['ty-legacy-001']);

    store.keyword = '';
    store.statusFilter = PublishStatus.PUBLISHED;
    expect(store.visibleItems.map((entry) => entry.id)).toEqual(['ty-suv-001']);
  });

  it('上架后就地更新列表项，并把新留痕插到缓存头部', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        const target = String(url);
        if (target.includes('/audit-logs')) {
          return Promise.resolve(jsonResponse({ success: true, data: [], requestId: 'req' }));
        }
        if (target.includes('/status')) {
          return Promise.resolve(
            jsonResponse({
              success: true,
              data: { car: car('ty-legacy-001', PublishStatus.PUBLISHED, { auditLogCount: 2 }), log },
              requestId: 'req',
            }),
          );
        }
        return Promise.resolve(
          jsonResponse({
            success: true,
            data: [car('ty-legacy-001', PublishStatus.OFFLINE, { auditLogCount: 1 })],
            requestId: 'req',
          }),
        );
      }),
    );

    const store = useCarStatusStore();
    await store.load();
    await store.loadLogs('ty-legacy-001');
    const result = await store.changeStatus('ty-legacy-001', CarStatusAction.PUBLISH, {
      actor: '周子涵',
    });

    expect(result.car.publishStatus).toBe(PublishStatus.PUBLISHED);
    expect(store.items[0]?.publishStatus).toBe(PublishStatus.PUBLISHED);
    expect(store.publishedCount).toBe(1);
    expect(store.logsOf('ty-legacy-001')[0]?.action).toBe(CarStatusAction.PUBLISH);
  });

  it('把服务端错误码翻译成可读提示，并且不修改列表状态', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          success: true,
          data: [car('ty-suv-001', PublishStatus.PUBLISHED)],
          requestId: 'req',
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          { success: false, error: { code: 'CAR_ALREADY_PUBLISHED', message: '该车型已处于上架状态' }, requestId: 'req' },
          false,
          409,
        ),
      );
    vi.stubGlobal('fetch', fetchMock);

    const store = useCarStatusStore();
    await store.load();

    await expect(
      store.changeStatus('ty-suv-001', CarStatusAction.PUBLISH),
    ).rejects.toThrow('该车型已处于上架状态');

    expect(store.items[0]?.publishStatus).toBe(PublishStatus.PUBLISHED);
    expect(store.describeError(new Error('自定义错误'))).toBe('自定义错误');
  });

  it('列表加载失败时进入 error 状态并保留错误信息', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(
          { success: false, error: { code: 'HTTP_ERROR', message: '服务器内部错误' }, requestId: 'req' },
          false,
          500,
        ),
      ),
    );

    const store = useCarStatusStore();
    await store.load();

    expect(store.status).toBe('error');
    expect(store.errorMessage).toBe('服务器内部错误');
  });
});
