import type { INestApplication } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApplication } from '../src/app.js';
import { AUTH_JWT_SECRET } from '../src/auth/auth.service.js';

/**
 * issue #26：后台接口未校验 Token。
 *
 * 前端路由守卫只能拦页面，不能拦直接调用；后台 /api/v1/admin/** 必须以
 * Authorization Bearer Token 为准，角色从 Token 解析，不信任可伪造的角色头。
 */
describe('后台接口鉴权（issue #26）', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createApplication();
    await app.init();
  });

  afterAll(async () => app.close());

  async function tokenOf(username: string, password: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username, password })
      .expect(200);
    return response.body.data.accessToken as string;
  }

  it('未携带 Token 访问后台接口返回 401', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/admin/cars/search')
      .expect(401);
    expect(response.body.success).toBe(false);
  });

  it('伪造 Token 返回 401', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/admin/cars')
      .set('Authorization', 'Bearer forged-token')
      .expect(401);
  });

  it('过期 Token 返回 401', async () => {
    const expired = jwt.sign(
      { sub: 'admin-1', username: 'admin', role: 'super_admin' },
      AUTH_JWT_SECRET,
      { expiresIn: -10 },
    );
    await request(app.getHttpServer())
      .get('/api/v1/admin/cars')
      .set('Authorization', `Bearer ${expired}`)
      .expect(401);
  });

  it('携带有效 Token 可以访问后台接口', async () => {
    const token = await tokenOf('editor', 'Editor@123');
    await request(app.getHttpServer())
      .get('/api/v1/admin/cars/search')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('角色以 Token 为准，忽略可伪造的 x-admin-role 头', async () => {
    const token = await tokenOf('editor', 'Editor@123');
    await request(app.getHttpServer())
      .post('/api/v1/admin/cars')
      .set('Authorization', `Bearer ${token}`)
      .set('x-admin-role', 'super_admin')
      .send({
        name: '途越鉴权测试',
        series: '鉴权系列',
        energyType: 'electric',
        tagline: '鉴权用例',
        description: '用于验证角色只能来自 Token 的接口测试车型描述。',
        priceMinCents: 10_000_000,
        priceMaxCents: 20_000_000,
        publishStatus: 'published',
      })
      .expect(403);
  });

  it('审核与上下架接口同样要求 Token', async () => {
    await request(app.getHttpServer()).get('/api/v1/admin/cars/review/pending').expect(401);
    await request(app.getHttpServer()).get('/api/v1/admin/cars/ty-suv-001/audit-logs').expect(401);
  });
});