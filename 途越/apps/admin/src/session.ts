import type { AuthResponse } from '@tuyue/contracts';

const SESSION_KEY = 'tuyue.admin.session';
/** US-CAR-13 的上下架留痕从该键读取操作人，登录成功后保持同步。 */
const USERNAME_KEY = 'tuyue.admin.username';

export function saveSession(session: AuthResponse): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  localStorage.setItem(USERNAME_KEY, session.user.username);
}

/** 读取本地登录态；Token 已过期或数据损坏时视为未登录，并清掉残留。 */
export function loadSession(): AuthResponse | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as AuthResponse;
    if (!session.accessToken || !session.user || !session.expiresAt) {
      clearSession();
      return null;
    }
    if (Date.parse(session.expiresAt) <= Date.now()) {
      clearSession();
      return null;
    }
    return session;
  } catch {
    clearSession();
    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(USERNAME_KEY);
}
