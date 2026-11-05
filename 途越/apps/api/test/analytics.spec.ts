import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApplication } from '../src/app.js';

describe('analytics API', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createApplication();
    await app.init();
  });

  afterAll(async () => app.close());

  it('returns dashboard metrics in the unified envelope', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/analytics/dashboard')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.totalVisits).toBe(12_480);
    expect(response.body.data.popularCars).toHaveLength(3);
    expect(response.body.requestId).toEqual(expect.any(String));
  });

  it('accepts a tracking event', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/analytics/events')
      .send({ name: 'page_view', properties: { page: 'dealers' } })
      .expect(201);

    expect(response.body.data).toEqual({ accepted: true });
  });

  it('rejects an event without a name', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/analytics/events')
      .send({})
      .expect(400);

    expect(response.body.error.code).toBe('INVALID_EVENT');
  });
});
