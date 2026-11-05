import type { AuthResponse } from '@tuyue/contracts';

const SESSION_KEY = 'tuyue.admin.session';
/** US-CAR-13 的上下架留痕从该键读取操作人，登录成功后保持同步。 */
const USERNAME_KEY = 'tuyue.admin.username';

export function saveSession(session: AuthResponse): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  localStorage.setItem(USERNAME_KEY, session.user.username);
}