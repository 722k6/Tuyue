import { AdminRole } from '@tuyue/contracts';

const ROLE_KEY = 'tuyue.admin.role';
const USERNAME_KEY = 'tuyue.admin.username';

function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function saveAdminSession(role: AdminRole, username: string): void {
  const target = storage();
  if (!target) return;
  target.setItem(ROLE_KEY, role);
  target.setItem(USERNAME_KEY, username.trim() || `mock_${role}`);
}

export function clearAdminSession(): void {
  const target = storage();
  if (!target) return;
  target.removeItem(ROLE_KEY);
  target.removeItem(USERNAME_KEY);
}

export function getAdminRole(): AdminRole | null {
  const value = storage()?.getItem(ROLE_KEY);
  return Object.values(AdminRole).includes(value as AdminRole) ? (value as AdminRole) : null;
}

export function getAdminUsername(): string {
  return storage()?.getItem(USERNAME_KEY) || 'web-admin';
}

/** HTTP 头只允许 ASCII，中文用户名必须先编码，服务端再解码。 */
export function getAdminUserHeader(): string {
  return encodeURIComponent(getAdminUsername());
}

export function hasAdminRole(...roles: AdminRole[]): boolean {
  const role = getAdminRole();
  return role !== null && roles.includes(role);
}
