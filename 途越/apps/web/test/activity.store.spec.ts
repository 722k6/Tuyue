import type { ActivityDto } from '@tuyue/contracts';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isOngoing, useActivityStore } from '../src/features/activity/activity.store';

const published: ActivityDto = {
  id: 'activity-001',
  name: '秋日探索季',
  coverImageUrl: '/mock/activities/activity-001.webp',
  startsAt: '2026-10-01T00:00:00.000Z',
  endsAt: '2026-11-30T23:59:59.000Z',
  summary: '用于联调的固定活动数据。',
  published: true,
};

const draft: ActivityDto = { ...published, id: 'activity-002', name: '未发布活动', published: false };

describe('activity store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.unstubAllGlobals();
  });

  it('loads the activity list from the mock API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: [published, draft], requestId: 'req-activity' }),
      }),
    );

    const store = useActivityStore();
    await store.load();

    expect(store.status).toBe('ready');
    expect(store.items.map((item) => item.id)).toEqual(['activity-001', 'activity-002']);
  });

  it('reports an error state when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    const store = useActivityStore();
    await store.load();

    expect(store.status).toBe('error');
    expect(store.items).toEqual([]);
  });

  it('counts only published activities inside the time window as ongoing', () => {
    const now = new Date('2026-11-03T12:00:00.000Z');

    expect(isOngoing(published, now)).toBe(true);
    expect(isOngoing(draft, now)).toBe(false);
    expect(isOngoing({ ...published, endsAt: '2026-10-02T00:00:00.000Z' }, now)).toBe(false);
    expect(isOngoing({ ...published, startsAt: '2026-12-01T00:00:00.000Z' }, now)).toBe(false);
  });
});
