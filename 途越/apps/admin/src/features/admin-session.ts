import { AdminRole } from '@tuyue/contracts';
import { clearSession, loadSession, saveSession } from '../session';

/**
 * 角色/用户名的兼容读层：真实登录态在 `session.ts`，
 * 这里保持 US-ADM-02 页面与临时请求头的调用方式不变。
 */
export function saveAdminSession(role: AdminRole, username: string): void {
  const name = username.trim() || `mock_${role}`;
  saveSession({
    accessToken: `local-mock-${role}`,
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    user: {
      id: `local-${role}`,
      username: name,
      displayName: name,
      role,
      permissions: [],
    },
  });
}

export function clearAdminSession(): void {
  clearSession();
}

export function getAdminRole(): AdminRole | null {
  return loadSession()?.user.role ?? null;
}

export function getAdminUsername(): string {
  return loadSession()?.user.username || 'web-admin';
}

/** HTTP 头只允许 ASCII，中文用户名必须先编码，服务端再解码。 */
export function getAdminUserHeader(): string {
  return encodeURIComponent(getAdminUsername());
}

export function hasAdminRole(...roles: AdminRole[]): boolean {
  const role = getAdminRole();
  return role !== null && roles.includes(role);
}
