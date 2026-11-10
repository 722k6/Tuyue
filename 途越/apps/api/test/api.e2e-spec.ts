import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApplication } from '../src/app.js';

describe('foundation smoke', () => {
  let app: INestApplication;
  beforeAll(async () => {
    app = await createApplication();
    await app.init();
  });
  afterAll(async () => app.close());

  it('serves health, list resources and Swagger from one application', async () => {
    await request(app.getHttpServer()).get('/api/health').expect(200);
    const cars = await request(app.getHttpServer()).get('/api/v1/cars').expect(200);
    const activities = await request(app.getHttpServer()).get('/api/v1/activities').expect(200);
    const dealers = await request(app.getHttpServer()).get('/api/v1/dealers').expect(200);
    await request(app.getHttpServer()).get('/api/docs').expect(200);
    expect(cars.body.data).toHaveLength(4);
    expect(activities.body.data).toHaveLength(1);
    expect(dealers.body.data).toHaveLength(2);
  });
});
