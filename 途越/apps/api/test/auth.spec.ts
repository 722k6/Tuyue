import type { INestApplication } from '@nestjs/common';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApplication } from '../src/app.js';
import { AUTH_JWT_SECRET, AUTH_TOKEN_TTL_SECONDS } from '../src/auth/auth.service.js';

describe('POST /api/v1/auth/login', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createApplication();
    await app.init();
  });

  afterAll(async () => app.close());

  it('issues a verifiable JWT for valid credentials', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'Admin@123' })
      .expect(200);

    expect(response.body.success).toBe(true);
    const { accessToken, user, expiresAt } = response.body.data;
    expect(user).toMatchObject({
      id: 'admin-1',
      username: 'admin',
      role: 'super_admin',
      permissions: expect.arrayContaining(['admin:manage']),
    });

    const payload = jwt.verify(accessToken, AUTH_JWT_SECRET) as JwtPayload;
    expect(payload).toMatchObject({ sub: 'admin-1', username: 'admin', role: 'super_admin' });
    expect(payload.exp! - payload.iat!).toBe(AUTH_TOKEN_TTL_SECONDS);
    expect(Date.parse(expiresAt)).toBeGreaterThan(Date.now());
  });

  it('trims the username before matching', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: '  editor  ', password: 'Editor@123' })
      .expect(200);
  });

  it('rejects a wrong password without revealing whether the account exists', async () => {
    const wrongPassword = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'wrong-password' })
      .expect(401);
    const unknownUser = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'nobody', password: 'wrong-password' })
      .expect(401);

    // 两种失败路径必须返回同一错误，否则可用于枚举账号
    expect(wrongPassword.body.error).toEqual({
      code: 'AUTH_INVALID_CREDENTIALS',
      message: '账号或密码错误',
    });
    expect(unknownUser.body.error).toEqual(wrongPassword.body.error);
  });

  it('rejects missing credentials with a validation error', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'admin' })
      .expect(400);
    expect(response.body.error.code).toBe('AUTH_INPUT_REQUIRED');
  });
});
