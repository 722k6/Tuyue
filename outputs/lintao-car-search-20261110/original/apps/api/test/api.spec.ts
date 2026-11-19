import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApplication } from '../src/app.js';

describe('Tuyue mock API', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createApplication();
    await app.init();
  });

  afterAll(async () => app.close());

  it('returns a successful health check', async () => {
    const response = await request(app.getHttpServer()).get('/api/health').expect(200);
    expect(response.body).toMatchObject({ success: true, data: { status: 'ok' } });
    expect(response.body.requestId).toEqual(expect.any(String));
  });

  it('returns the stable car fixture list', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/cars').expect(200);
    expect(response.body.data.map((car: { id: string }) => car.id)).toEqual([
      'ty-suv-001',
      'ty-ev-001',
      'ty-hybrid-001',
    ]);
  });

  it('returns the unified error for an unknown car', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/cars/not-found').expect(404);
    expect(response.body).toEqual({
      success: false,
      error: { code: 'CAR_NOT_FOUND', message: '车型不存在' },
      requestId: expect.any(String),
    });
  });

  it.each(['editor', 'reviewer', 'super_admin'])('mock login returns the %s role', async (role) => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/mock-login')
      .send({ username: `tester_${role}`, role })
      .expect(201);
    expect(response.body.data.user.role).toBe(role);
    expect(response.body.data.accessToken).toContain(role);
  });

  it('publishes OpenAPI JSON', async () => {
    const response = await request(app.getHttpServer()).get('/api/openapi.json').expect(200);
    expect(response.body.info.title).toBe('途越汽车 Mock API');
  });
});
