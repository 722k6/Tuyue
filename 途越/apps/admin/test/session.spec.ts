import type { AuthResponse } from '@tuyue/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearSession,
  getAccessToken,
  loadSession,
  notifyUnauthorized,
  saveSession,
  setUnauthorizedHandler,
} from '../src/session';

const SESSION_KEY = 'tuyue.admin.session';
const USERNAME_KEY = 'tuyue.admin.username';

function makeSession(expiresAt = new Date(Date.now() + 3_600_000).toISOString()): AuthResponse {
  return {
    accessToken: 'header.payload.signature',
    expiresAt,
    user: {
      id: 'admin-2',
      username: 'editor',
      displayName: '内容编辑',
      role: 'editor',
      permissions: ['content:edit'],
    },
  };
}

beforeEach(() => {
  localStorage.clear();
  setUnauthorizedHandler(() => {});
});

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('admin session storage', () => {
  it('saves the session and keeps the legacy username key in sync', () => {
    saveSession(makeSession());

    expect(loadSession()?.user.username).toBe('editor');
    expect(getAccessToken()).toBe('header.payload.signature');
    // US-CAR-13 的留痕仍然依赖这个键
    expect(localStorage.getItem(USERNAME_KEY)).toBe('editor');
  });

  it('treats an expired token as signed out and clears the leftovers', () => {
    saveSession(makeSession(new Date(Date.now() - 1000).toISOString()));

    expect(loadSession()).toBeNull();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
    expect(localStorage.getItem(USERNAME_KEY)).toBeNull();
  });

  it('recovers from corrupted storage instead of crashing', () => {
    localStorage.setItem(SESSION_KEY, '{not-json');

    expect(loadSession()).toBeNull();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('clears the session when the API reports unauthorized', () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    saveSession(makeSession());

    notifyUnauthorized();

    expect(loadSession()).toBeNull();
    expect(localStorage.getItem(USERNAME_KEY)).toBeNull();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('clearSession removes both keys', () => {
    saveSession(makeSession());

    clearSession();

    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
    expect(localStorage.getItem(USERNAME_KEY)).toBeNull();
  });
});