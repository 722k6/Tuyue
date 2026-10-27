import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CarSummary } from '@tuyue/contracts';
import { useHealthStore } from '../src/stores/health';

describe('web health store', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('reads shared CarSummary and reports API health', async () => {
    const typedCar: Pick<CarSummary, 'id' | 'name'> = { id: 'ty-suv-001', name: '途越远行' };
    expect(typedCar.id).toBe('ty-suv-001');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { status: 'ok' }, requestId: 'req-web' }),
    }));

    const store = useHealthStore();
    await store.check();

    expect(store.status).toBe('ok');
    expect(store.requestId).toBe('req-web');
  });
});
