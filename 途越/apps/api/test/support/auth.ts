import type { INestApplication } from '@nestjs/common';
import request, { type Test } from 'supertest';

/** 与 src/auth/accounts.ts 的种子账号保持一致。 */
export const ADMIN_ACCOUNTS = {
  editor: { username: 'editor', password: 'Editor@123' },
  reviewer: { username: 'reviewer', password: 'Reviewer@123' },
  superAdmin: { username: 'admin', password: 'Admin@123' },
} as const;

export type AdminAccountKey = keyof typeof ADMIN_ACCOUNTS;

const tokenCache = new Map<AdminAccountKey, string>();

export async function loginToken(
  app: INestApplication,
  account: AdminAccountKey,
): Promise<string> {
  const cached = tokenCache.get(account);
  if (cached) return cached;
  const { username, password } = ADMIN_ACCOUNTS[account];
  const response = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ username, password })
    .expect(200);
  const token = response.body.data.accessToken as string;
  tokenCache.set(account, token);
  return token;
}

function authorized(test: Test, token: string): Test {
  return test.set('Authorization', `Bearer ${token}`);
}

/** 后台接口一律携带 Bearer Token，模拟登录后的后台调用。 */
export function adminApi(app: INestApplication, token: string) {
  const server = app.getHttpServer();
  return {
    get: (url: string) => authorized(request(server).get(url), token),
    post: (url: string) => authorized(request(server).post(url), token),
    put: (url: string) => authorized(request(server).put(url), token),
    delete: (url: string) => authorized(request(server).delete(url), token),
  };
}