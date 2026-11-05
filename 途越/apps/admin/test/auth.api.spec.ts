import type { AuthResponse } from '@tuyue/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { carsApi, login } from '../src/api';
import { loadSession, saveSession, setUnauthorizedHandler } from '../src/session';

function makeSession(): AuthResponse {
  return {
    accessToken: 'header.payload.signature',
    expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    user: {
      id: 'admin-2',
      username: 'editor',
      displayName: '内容编辑',
      role: 'editor',
      permissions: ['content:edit'],
    },
  };
}

function stubFetch(
  payload: unknown,
  init: { ok?: boolean; status?: number } = {},
): ReturnType<typeof vi.fn> {
  const mock = vi.fn().mockResolvedValue({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => payload,
  });
  vi.stubGlobal('fetch', mock);
  return mock;
}

function headersOf(mock: ReturnType<typeof vi.fn>, callIndex = 0): Headers {
  const init = mock.mock.calls[callIndex]?.[1] as RequestInit | undefined;
  return new Headers(init?.headers);
}

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
  setUnauthorizedHandler(() => {});
});

describe('admin API authentication wiring', () => {
  it('attaches the bearer token to business requests', async () => {
    saveSession(makeSession());
    const mock = stubFetch({
      success: true,
      data: { items: [], page: 1, pageSize: 10, total: 0 },
      requestId: 'r',
    });

    await carsApi.list();

    expect(headersOf(mock).get('authorization')).toBe('Bearer header.payload.signature');
  });

  it('never attaches the token to the login request itself', async () => {
    saveSession(makeSession());
    const mock = stubFetch({
      success: true,
      data: makeSession(),
      requestId: 'r',
    });

    await login({ username: 'editor', password: 'Editor@123' });

    expect(headersOf(mock).get('authorization')).toBeNull();
  });

  it('clears the session and notifies the router on 401', async () => {
    saveSession(makeSession());
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    stubFetch(
      { success: false, error: { code: 'AUTH_INVALID_CREDENTIALS', message: '登录已失效' } },
      { ok: false, status: 401 },
    );

    await expect(carsApi.list()).rejects.toThrow('登录已失效');

    expect(loadSession()).toBeNull();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('keeps the session when the server returns a non-401 error', async () => {
    saveSession(makeSession());
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    stubFetch(
      { success: false, error: { code: 'CAR_NOT_FOUND', message: '车型不存在' } },
      { ok: false, status: 404 },
    );

    await expect(carsApi.detail('nope')).rejects.toThrow('车型不存在');

    expect(loadSession()).not.toBeNull();
    expect(handler).not.toHaveBeenCalled();
  });
});
