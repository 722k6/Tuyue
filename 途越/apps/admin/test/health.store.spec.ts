import { AdminRole, type AuthUser } from '@tuyue/contracts';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAdminHealthStore } from '../src/stores/health';

describe('admin health store', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('reads shared AdminRole and reports API health', async () => {
    const typedUser: Pick<AuthUser, 'role'> = { role: AdminRole.REVIEWER };
    expect(typedUser.role).toBe('reviewer');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { status: 'ok' }, requestId: 'req-admin' }),
    }));

    const store = useAdminHealthStore();
    await store.check();
    expect(store.status).toBe('ok');
    expect(store.requestId).toBe('req-admin');
  });
});
